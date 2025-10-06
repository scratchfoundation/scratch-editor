from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
import requests

app = FastAPI()

# Habilitar CORS (para Scratch GUI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # o ["http://localhost:8601"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def decode_image(image_b64: str):
    """Convierte base64 a imagen OpenCV (BGR)."""
    img_data = base64.b64decode(image_b64.split(",")[1])
    np_arr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def encode_image(img) -> str:
    """Convierte imagen OpenCV (BGR) a base64 para enviar al cliente."""
    _, buffer = cv2.imencode(".jpg", img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

@app.post("/process")
async def process_image(request: Request):
    body = await request.json()
    op = body.get("op")
    params = body.get("params", {})
    image_b64 = body.get("image_b64")
    image_url = body.get("image_url")  # 🔹 Nuevo soporte URL

    # --- Log para debug ---
    print("🔹 Body recibido:", body.keys())

    # Obtener imagen
    if image_url:
        print(f"📥 Descargando imagen desde URL: {image_url}")
        resp = requests.get(image_url)
        np_arr = np.frombuffer(resp.content, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    elif image_b64:
        print("📥 Decodificando imagen en base64")
        img = decode_image(image_b64)
    else:
        return {"error": "No se recibió imagen (ni URL ni base64)"}

    # ----- OPERACIONES -----
    if op == "brightness":
        beta = float(params.get("beta", 0))
        img = cv2.convertScaleAbs(img, alpha=1.0, beta=beta)

    elif op == "contrast":
        alpha = float(params.get("alpha", 1.0))
        img = cv2.convertScaleAbs(img, alpha=alpha, beta=0)

    elif op == "saturation":
        s = float(params.get("s", 1.0))
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype("float32")
        hsv[..., 1] *= s
        hsv[..., 1] = np.clip(hsv[..., 1], 0, 255)
        img = cv2.cvtColor(hsv.astype("uint8"), cv2.COLOR_HSV2BGR)

    elif op == "invert":
        img = cv2.bitwise_not(img)

    elif op == "pixelate":
        factor = int(params.get("factor", 8))
        h, w = img.shape[:2]
        temp = cv2.resize(img, (w // factor, h // factor), interpolation=cv2.INTER_LINEAR)
        img = cv2.resize(temp, (w, h), interpolation=cv2.INTER_NEAREST)

    elif op == "circles":
        print("🔵 Detectando círculos...")

        # Convertir a escala de grises
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.medianBlur(gray, 5)

        # Detectar círculos con HoughCircles
        circles = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1.2,          # resolución del acumulador (ajustable)
            minDist=30,      # distancia mínima entre centros de círculos
            param1=100,      # umbral superior del detector de bordes Canny
            param2=30,       # umbral del acumulador de centros
            minRadius=10,    # radio mínimo
            maxRadius=200    # radio máximo
        )

        if circles is not None:
            circles = np.uint16(np.around(circles))
            print(f"🔵 Se detectaron {len(circles[0])} círculos")
            for i in circles[0, :]:
                center = (i[0], i[1])
                radius = i[2]
                # Dibuja el círculo en verde
                cv2.circle(img, center, radius, (0, 255, 0), 3)
                # Marca el centro con un punto rojo
                cv2.circle(img, center, 3, (0, 0, 255), -1)
                cv2.putText(img, "Circulo", (i[0]-20, i[1]-radius-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    elif op == "rectangles":
        # Convertir a escala de grises y aplicar desenfoque
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Detectar bordes
        edges = cv2.Canny(blurred, 50, 150)

        # Encontrar contornos
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        count_rects = 0
        for cnt in contours:
            approx = cv2.approxPolyDP(cnt, 0.02 * cv2.arcLength(cnt, True), True)
            area = cv2.contourArea(cnt)

            # Un rectángulo tiene 4 vértices y área razonable
            if len(approx) == 4 and area > 1000:
                cv2.drawContours(img, [approx], 0, (0, 255, 0), 3)
                count_rects += 1

        print(f"✅ Rectángulos detectados: {count_rects}")

    elif op == "canny":
        t1 = float(params.get("t1", 100))
        t2 = float(params.get("t2", 200))
        img = cv2.Canny(img, t1, t2)
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    elif op == "sobel":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        abs_grad = cv2.convertScaleAbs(cv2.addWeighted(grad_x, 0.5, grad_y, 0.5, 0))
        img = cv2.cvtColor(abs_grad, cv2.COLOR_GRAY2BGR)

    elif op == "gaussian":
        k = int(params.get("k", 5))
        if k % 2 == 0:  # kernel debe ser impar
            k += 1
        img = cv2.GaussianBlur(img, (k, k), 0)

    elif op == "sharpen":
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        img = cv2.filter2D(img, -1, kernel)

    elif op == "rotate":
        deg = float(params.get("deg", 15))
        h, w = img.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), deg, 1)
        img = cv2.warpAffine(img, M, (w, h))

    elif op == "scale":
            s = float(params.get("s", 1.0))

            # Evitar valores extremos o negativos
            if not (0.1 <= s <= 5.0):
                print(f"⚠️ Valor de escala inválido: {s}. Se usará 1.0 por defecto.")
                s = 1.0

            h, w = img.shape[:2]
            new_w = int(w * s)
            new_h = int(h * s)

            # Limitar tamaño máximo (ej. 4096x4096 píxeles)
            if new_w > 4096 or new_h > 4096:
                print(f"⚠️ Imagen demasiado grande ({new_w}x{new_h}), ajustando tamaño máximo.")
                new_w = min(new_w, 4096)
                new_h = min(new_h, 4096)

            img = cv2.resize(img, (new_w, new_h))

    elif op == "translate":
        dx = int(params.get("dx", 20))
        dy = int(params.get("dy", 20))
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        h, w = img.shape[:2]
        img = cv2.warpAffine(img, M, (w, h))

    elif op == "orb":
        orb = cv2.ORB_create()
        kp, des = orb.detectAndCompute(img, None)
        img = cv2.drawKeypoints(img, kp, None, color=(0, 255, 0))

    elif op == "watershed":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        img = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)

    elif op == "kmeans":
        K = int(params.get("K", 3))
        Z = img.reshape((-1, 3)).astype(np.float32)
        _, labels, centers = cv2.kmeans(
            Z, K, None,
            (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0),
            10, cv2.KMEANS_RANDOM_CENTERS
        )
        centers = np.uint8(centers)
        img = centers[labels.flatten()].reshape(img.shape)

    # -----------------------

    result_b64 = encode_image(img)
    return {"image_b64": result_b64}
