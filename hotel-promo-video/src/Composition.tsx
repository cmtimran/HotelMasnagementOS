import React from "react";
import { Composition, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { Scene1Problem } from "./Scene1Problem";
import { Scene2Intro } from "./Scene2Intro";
import { Scene3Features } from "./Scene3Features";
import { Scene4CTA } from "./Scene4CTA";
import { WordByWordCaptions } from "./WordByWordCaptions";
import captionsData from "./captions.json";
import type { Caption } from "@remotion/captions";

export const MainVideo: React.FC = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#070C18",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. Bengali Neural Voiceover Audio */}
      <Audio src={staticFile("voiceover.mp3")} />

      {/* 2. Visual Scene Sequence (0 to 900 frames / 30 seconds @ 30fps) */}
      <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
        {/* Scene 1: The Problem (0 - 230 frames / 0 - 7.66s) */}
        <div style={{ width: "100%", height: "100%" }}>
          <SceneSwitcher />
        </div>
      </div>

      {/* 3. Word-by-Word Animated Bengali Captions Layer */}
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <WordByWordCaptions
          captions={captionsData as Caption[]}
        />
      </div>
    </div>
  );
};

// Scene switcher that mounts the active scene based on frame number
import { useCurrentFrame } from "remotion";

const SceneSwitcher: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame < 230) {
    return <Scene1Problem />;
  } else if (frame < 438) {
    return <Scene2Intro />;
  } else if (frame < 650) {
    return <Scene3Features />;
  } else {
    return <Scene4CTA />;
  }
};

export const MyComposition = () => {
  return (
    <Composition
      id="HotelPromoVideo"
      component={MainVideo}
      durationInFrames={900}
      fps={30}
      width={1280}
      height={720}
    />
  );
};
