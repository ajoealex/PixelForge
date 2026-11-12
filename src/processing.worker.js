import { processImage } from "./imageProcessing.js";

self.onmessage = ({
  data: { id, image, tool, settings, selection, shape },
}) => {
  try {
    const result = processImage(image, tool, settings, selection, shape);
    const changed = result.data.some(
      (value, index) => value !== image.data[index],
    );
    self.postMessage({ id, image: result, changed }, [result.data.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
