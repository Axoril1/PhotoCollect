import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs';

export const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
};

/**
 * Decodes an image buffer into a 3D RGB Tensor using sharp and tfjs (pure JS).
 * This eliminates the platform-dependent C++ build compilation issues on Windows / macOS.
 */
export const decodeImageBuffer = async (imageBuffer: Buffer): Promise<tf.Tensor3D> => {
  const { data, info } = await sharp(imageBuffer)
    .removeAlpha() // Remove transparency/alpha channel to force exactly 3 channels (RGB)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  );
};
