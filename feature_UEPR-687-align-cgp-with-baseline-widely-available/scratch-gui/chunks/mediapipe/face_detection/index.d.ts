/**
 * @fileoverview Declarations for the face tracking API.
 */

/**
 * Version number of this package.
 */
export const VERSION: string;

/**
 * Represents pairs of (start,end) indexes so that we can connect landmarks
 * with lines to provide a skeleton when we draw the points.
 */
export declare type LandmarkConnectionArray = Array<[number, number]>;

/**
 * Represents a normalized rectangle. Has an ID that should be consistent
 * across calls.
 */
export declare interface NormalizedRect {
  xCenter: number;
  yCenter: number;
  height: number;
  width: number;
  rotation: number;
  rectId: number;
}

/**
 * Represents a single normalized landmark.
 */
export declare interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * We support several ways to get image inputs.
 */
export type InputImage = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

/**
 * Legal inputs for FaceDetection.
 */
export interface InputMap {
  image: InputImage;
}

/**
 * GpuBuffers should all be compatible with Canvas' `drawImage`
 */
type GpuBuffer = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

/**
 * One list of landmarks.
 */
export type NormalizedLandmarkList = NormalizedLandmark[];

/**
 * Multiple lists of landmarks.
 */
export type NormalizedLandmarkListList = NormalizedLandmarkList[];

/**
 * Represents a detection, which is a bounding box with landmarks.
 */
export interface Detection {
  boundingBox: NormalizedRect;
  landmarks: NormalizedLandmarkList;
}

/**
 * Represents a list of detections.
 */
export type DetectionList = Detection[];

/**
 * Possible results from FaceDetection.
 */
export interface Results {
  detections: DetectionList;
  image: GpuBuffer;
}

/**
 * Configurable options for FaceDetection.
 */
export interface Options {
  selfieMode?: boolean;
  model?: string;
  minDetectionConfidence?: number;
}

/**
 * Listener for any results from FaceDetection.
 */
export type ResultsListener = (results: Results) => (Promise<void>|void);

/**
 * Contains all of the setup options to drive the face solution.
 */
export interface FaceDetectionConfig {
  locateFile?: (path: string, prefix?: string) => string;
}

/**
 * Declares the interface of FaceDetection.
 */
declare interface FaceDetectionInterface {
  close(): Promise<void>;
  onResults(listener: ResultsListener): void;
  initialize(): Promise<void>;
  send(inputs: InputMap): Promise<void>;
  setOptions(options: Options): void;
}

/**
 * Encapsulates the entire FaceDetection solution. All that is needed from the
 * developer is the source of the image data. The user will call `send`
 * repeatedly and if a face is detected, then the user can receive callbacks
 * with this metadata.
 */
export declare class FaceDetection implements FaceDetectionInterface {
  constructor(config?: FaceDetectionConfig);

  /**
   * Shuts down the object. Call before creating a new instance.
   */
  close(): Promise<void>;

  /**
   * Registers a single callback that will carry any results that occur
   * after calling Send().
   */
  onResults(listener: ResultsListener): void;

  /**
   * Initializes the solution. This includes loading ML models and mediapipe
   * configurations, as well as setting up potential listeners for metadata. If
   * `initialize` is not called manually, then it will be called the first time
   * the developer calls `send`.
   */
  initialize(): Promise<void>;

  /**
   * Tells the graph to restart before the next frame is sent.
   */
  reset(): void;

  /**
   * Processes a single frame of data, which depends on the options sent to the
   * constructor.
   */
  send(inputs: InputMap): Promise<void>;

  /**
   * Adjusts options in the solution. This may trigger a graph reload the next
   * time the graph tries to run.
   */
  setOptions(options: Options): void;
}
