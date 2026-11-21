import { Composition } from "remotion";
import { MainComposition } from "./Composition";
import {
  calculateMetadata,
  getTotalDurationInFrames,
  getVideoSettings,
  videoData,
} from "./config";

const settings = getVideoSettings(videoData);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        component={MainComposition}
        durationInFrames={getTotalDurationInFrames(videoData, settings.fps)}
        fps={settings.fps}
        width={settings.width}
        height={settings.height}
        defaultProps={{ data: videoData }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
