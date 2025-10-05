from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np, cv2, base64

app = FastAPI(title="Vision API")

class Payload(BaseModel):
    image_b64: str        # "data:image/png;base64,...." o solo base64 puro
    op: str               # "brightness", "canny", "kmeans", etc.
    params: dict | None = None

def read_b64(data):
    if data.startswith("data:"):
        data = data.split(",")[1]
    arr = np.frombuffer(base64.b64decode(data), dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

def to_b64(img):
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return "data:image/png;base64," + base64.b64encode(buf).decode("utf-8")

# --------- Operaciones ---------
def op_brightness(img, beta=30, alpha=1.0):
    return cv2.convertScaleAbs(img, alpha=float(alpha), beta=float(beta))

def op_saturation(img, s=1.3):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:,:,1] = np.clip(hsv[:,:,1]*float(s), 0, 255)
    hsv = hsv.astype(np.uint8)
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

def op_invert(img):
    return cv2.bitwise_not(img)

def op_pixelate(img, factor=8):
    h, w = img.shape[:2]
    small = cv2.resize(img, (w//factor, h//factor), interpolation=cv2.INTER_LINEAR)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)

def op_blur(img, k=5):
    k = int(k) if int(k)%2==1 else int(k)+1
    return cv2.blur(img, (k,k))

def op_gaussian(img, k=5):
    k = int(k) if int(k)%2==1 else int(k)+1
    return cv2.GaussianBlur(img, (k,k), 0)

def op_sharpen(img):
    kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    return cv2.filter2D(img, -1, kernel)

def op_canny(img, t1=100, t2=200):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, int(t1), int(t2))
    return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

def op_sobel(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    mag = cv2.convertScaleAbs(np.hypot(gx,gy))
    return cv2.cvtColor(mag, cv2.COLOR_GRAY2BGR)

def op_contours(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _,th = cv2.threshold(gray,0,255,cv2.THRESH_OTSU+cv2.THRESH_BINARY)
    cnts,_ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    vis = img.copy()
    cv2.drawContours(vis, cnts, -1, (0,255,0), 2)
    return vis

def op_rotate(img, deg=15):
    h,w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w/2,h/2), float(deg), 1.0)
    return cv2.warpAffine(img, M, (w,h))

def op_scale(img, s=1.2):
    return cv2.resize(img, None, fx=float(s), fy=float(s))

def op_translate(img, dx=20, dy=20):
    h,w = img.shape[:2]
    M = np.float32([[1,0,float(dx)],[0,1,float(dy)]])
    return cv2.warpAffine(img, M, (w,h))

def op_circles(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    circles = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, 1.2, 50,
                               param1=100, param2=30, minRadius=20, maxRadius=0)
    vis = img.copy()
    if circles is not None:
        for x,y,r in np.uint16(np.around(circles[0,:])):
            cv2.circle(vis, (x,y), r, (0,0,255), 2)
    return vis

def op_rectangles(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _,th = cv2.threshold(gray,0,255,cv2.THRESH_OTSU+cv2.THRESH_BINARY)
    cnts,_ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    vis = img.copy()
    for c in cnts:
        approx = cv2.approxPolyDP(c, 0.02*cv2.arcLength(c,True), True)
        if len(approx)==4 and cv2.contourArea(c) > 2000:
            x,y,w,h = cv2.boundingRect(approx)
            cv2.rectangle(vis,(x,y),(x+w,y+h),(255,0,0),2)
    return vis

def op_orb(img):
    orb = cv2.ORB_create(nfeatures=500)
    kp = orb.detect(img, None)
    kp, des = orb.compute(img, kp)
    return cv2.drawKeypoints(img, kp, None, color=(0,255,0), flags=0)

def op_watershed(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _,th = cv2.threshold(gray,0,255,cv2.THRESH_OTSU+cv2.THRESH_BINARY_INV)
    kernel = np.ones((3,3),np.uint8)
    opening = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=2)
    sure_bg = cv2.dilate(opening, kernel, iterations=3)
    dist = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
    _, sure_fg = cv2.threshold(dist, 0.5*dist.max(), 255, 0)
    sure_fg = np.uint8(sure_fg)
    unknown = cv2.subtract(sure_bg, sure_fg)
    _, markers = cv2.connectedComponents(sure_fg)
    markers = markers + 1
    markers[unknown==255] = 0
    img2 = img.copy()
    cv2.watershed(img2, markers)
    img2[markers==-1] = [0,0,255]
    return img2

def op_kmeans(img, K=3):
    Z = img.reshape((-1,3))
    Z = np.float32(Z)
    criteria = (cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _,label,center = cv2.kmeans(Z, int(K), None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    center = np.uint8(center)
    res = center[label.flatten()].reshape(img.shape)
    return res

# Optical flow requiere 2 frames: manejaremos fuera (en la extensión) el frame anterior.
# Aquí solo devolvemos la imagen que llega (para demo), o podrías dibujar flechas si recibes prev.
def op_passthrough(img):
    return img

OPS = {
    # Básico
    "brightness": op_brightness,
    "contrast":   op_brightness,  # usar alpha
    "saturation": op_saturation,
    "invert":     op_invert,
    "pixelate":   op_pixelate,
    "blur":       op_blur,
    "circles":    op_circles,
    "rectangles": op_rectangles,
    # Intermedio
    "canny":      op_canny,
    "sobel":      op_sobel,
    "gaussian":   op_gaussian,
    "sharpen":    op_sharpen,
    "contours":   op_contours,
    "rotate":     op_rotate,
    "scale":      op_scale,
    "translate":  op_translate,
    # Avanzado
    "orb":        op_orb,
    "watershed":  op_watershed,
    "kmeans":     op_kmeans,
    "flow":       op_passthrough
}

@app.post("/process")
def process(p: Payload):
    img = read_b64(p.image_b64)
    params = p.params or {}
    f = OPS.get(p.op)
    if not f:
        return {"error": f"unknown op {p.op}"}
    out = f(img, **{k: v for k,v in params.items() if v is not None})
    return {"image_b64": to_b64(out)}
