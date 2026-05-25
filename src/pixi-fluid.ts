import { Filter, GlProgram } from 'pixi.js';

const vertexSrc = `
  in vec2 aPosition;
  out vec2 vTextureCoord;
  uniform mat3 uProjectionMatrix;
  uniform vec4 uInputSize;
  uniform vec4 uOutputFrame;
  uniform vec4 uInputFrame;
  vec4 filterVertexPosition() {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uInputSize.x) - 1.0;
    position.y = position.y * (2.0 / uInputSize.y) - 1.0;
    return vec4((vec3(position, 1.0) * uProjectionMatrix).xy, 0.0, 1.0);
  }
  vec2 filterTextureCoord() {
    return aPosition * (uOutputFrame.zw * uInputSize.zw) + uInputFrame.xy * uInputSize.zw;
  }
  void main() {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
  }
`;

const fragmentSrc = `
  in vec2 vTextureCoord;
  out vec4 finalColor;
  uniform sampler2D uTexture;
  uniform float uThreshold;

  void main() {
    vec4 c = texture(uTexture, vTextureCoord);
    float a = smoothstep(uThreshold - 0.06, uThreshold + 0.06, c.a);
    finalColor = vec4(c.rgb * a, a);
  }
`;

/** 阈值 Filter：接在 BlurFilter 后面，高 alpha 区域硬化 → metaball 融合 */
export function createThresholdFilter() {
  const program = new GlProgram({
    vertex: vertexSrc,
    fragment: fragmentSrc,
    name: 'metaball-threshold',
  });

  return new Filter({
    glProgram: program,
    resources: {
      thresholdUniforms: {
        uThreshold: { value: 0.25, type: 'f32' },
      },
    },
    padding: 0,
  });
}
