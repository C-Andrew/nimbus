import Phaser from '/node_modules/phaser/dist/phaser.esm.js';
import { createPlayScene } from './scenes/play-scene.js';

export function createGame(parent, catalogs, onReady) {
  const PlayScene = createPlayScene(catalogs, onReady);
  return new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#10151c',
    antialias: false,
    fps: { target: 60, limit: 60 },
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    scene: PlayScene,
    input: { activePointers: 2 },
    audio: { noAudio: true },
  });
}
