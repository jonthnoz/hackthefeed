import { Composition, registerRoot } from 'remotion';
import { Demo } from './Demo';
import { COMPOSITION_ID, FPS, totalSeconds, type DemoProps } from './timeline';

const empty: DemoProps = { scenes: [], live: { dir: 'live', frames: [] }, brief: { dir: 'brief', frames: [] }, explore: { dir: 'explore', frames: [] } };

registerRoot(() => <Composition id={COMPOSITION_ID} component={Demo} width={1920} height={1080} fps={FPS} durationInFrames={1} defaultProps={empty}
  calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(totalSeconds(props.scenes) * FPS)) })} />);
