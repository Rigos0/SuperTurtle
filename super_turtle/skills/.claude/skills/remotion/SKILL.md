# Remotion Skill

Remotion is a React framework for creating videos programmatically. Build video compositions with React components, animations, and audio—all rendered to MP4, WebM, or other formats.

## Composition Architecture

### Core Concept: Composition Structure

A Remotion composition is a React component that represents a video. Structure your compositions clearly:

```tsx
import { Composition } from 'remotion';
import { MyVideo } from './MyVideo';

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        title: 'My Video Title',
      }}
    />
  );
};
```

### Props and Types

Always define types for composition props and state:

```tsx
interface MyVideoProps {
  title: string;
  duration?: number;
  bgColor?: string;
}

export const MyVideo: React.FC<MyVideoProps> = ({
  title,
  duration = 300,
  bgColor = '#000000',
}) => {
  return (
    <div style={{ backgroundColor: bgColor, width: '100%', height: '100%' }}>
      {title}
    </div>
  );
};
```

## Animation Patterns

### Sequence: Organizing Timeline Events

Use `Sequence` to position elements at specific frames and control their visibility:

```tsx
import { Sequence, AbsoluteFill } from 'remotion';

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      {/* Fade in for first 30 frames */}
      <Sequence from={0} durationInFrames={30}>
        <FadeInText text="Hello" />
      </Sequence>

      {/* Play title from frame 30 to 150 */}
      <Sequence from={30} durationInFrames={120}>
        <Title text="My Title" />
      </Sequence>

      {/* Outro at the end */}
      <Sequence from={180}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
```

### Interpolation: Smooth Value Changes

Use `interpolate` for frame-based animation values:

```tsx
import { interpolate, useCurrentFrame } from 'remotion';

export const AnimatedBox = ({ from, to }: { from: number; to: number }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 60], [0.8, 1.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        width: 100,
        height: 100,
        backgroundColor: '#3498db',
      }}
    />
  );
};
```

### Easing Functions

Apply easing to interpolations for natural motion:

```tsx
import { interpolate, useCurrentFrame, Easing } from 'remotion';

const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

const offset = interpolate(
  frame,
  [0, 100],
  [0, 500],
  {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  }
);
```

### Delay: Staggering Animations

Create staggered effects by calculating delays:

```tsx
export const StaggeredList = ({ items }: { items: string[] }) => {
  const frame = useCurrentFrame();
  const itemDelay = 15; // Frames between each item

  return (
    <div>
      {items.map((item, index) => {
        const itemStartFrame = index * itemDelay;
        const itemProgress = Math.max(0, frame - itemStartFrame) / 30;
        const opacity = Math.min(itemProgress, 1);

        return (
          <div key={index} style={{ opacity, marginBottom: 20 }}>
            {item}
          </div>
        );
      })}
    </div>
  );
};
```

## Audio Integration

### Loading and Synchronizing Audio

Use `Audio` component and calculate timing with frame math:

```tsx
import { Audio, useCurrentFrame, useVideoConfig } from 'remotion';

export const VideoWithAudio = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Audio starts at frame 30 (1 second at 30fps)
  const audioStartFrame = 30;
  const audioCurrentTime = (frame - audioStartFrame) / fps;

  return (
    <>
      <Audio
        src="path/to/audio.mp3"
        startFrom={audioStartFrame}
      />
      {/* Rest of composition */}
    </>
  );
};
```

### Volume Control

Adjust audio volume over time:

```tsx
import { Audio, useCurrentFrame, interpolate } from 'remotion';

export const FadeInAudio = () => {
  const frame = useCurrentFrame();

  const volume = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Audio
      src="path/to/audio.mp3"
      volume={volume}
    />
  );
};
```

## Asset Management

### Static Assets

Place assets in the `public/` directory and reference them with absolute paths:

```tsx
// In your Remotion composition:
<img src="/assets/logo.png" style={{ width: 200, height: 200 }} />

// Or in Video component:
<Video src="/videos/background.mp4" style={{ width: '100%', height: '100%' }} />
```

### Dynamic Asset Loading

For programmatically generated content, create assets on the fly:

```tsx
import { Img } from 'remotion';

interface ImageAsset {
  src: string;
  duration: number;
}

export const DynamicAssetSequence = ({ assets }: { assets: ImageAsset[] }) => {
  let currentFrame = 0;

  return (
    <>
      {assets.map((asset, index) => {
        const sequence = (
          <Sequence key={index} from={currentFrame} durationInFrames={asset.duration}>
            <Img src={asset.src} style={{ width: '100%', height: '100%' }} />
          </Sequence>
        );
        currentFrame += asset.duration;
        return sequence;
      })}
    </>
  );
};
```

### Bundling Assets

For production, ensure assets are properly bundled:

- Keep assets under `public/` directory
- Reference with absolute paths (`/assets/image.png`, not relative)
- Remotion's render process will resolve paths correctly
- For Webpack build: configure asset loading in `remotion.config.ts` if needed

## Rendering & Exporting

### Local Preview & Development

Use the Remotion CLI for development:

```bash
npm run dev  # Starts dev server at localhost:3000
```

### Server-Side Rendering with `renderMedia`

Programmatically render compositions to files:

```tsx
import { renderMedia, selectComposition } from '@remotion/renderer';

const composition = await selectComposition({
  serveUrl: 'http://localhost:3000',
  id: 'MyVideo',
  inputProps: {
    title: 'Generated Title',
  },
});

await renderMedia({
  composition,
  serveUrl: 'http://localhost:3000',
  codec: 'h264',
  outputLocation: '/tmp/video.mp4',
});
```

### Batch Rendering

Render multiple compositions efficiently:

```tsx
const compositionIds = ['Video1', 'Video2', 'Video3'];
const outputs = [];

for (const id of compositionIds) {
  const output = await renderMedia({
    composition: await selectComposition({
      serveUrl: 'http://localhost:3000',
      id,
    }),
    serveUrl: 'http://localhost:3000',
    outputLocation: `/tmp/${id}.mp4`,
    codec: 'h264',
  });
  outputs.push(output);
}
```

### Output Formats

Choose appropriate codec and format:

```tsx
// H.264 (most compatible, slower encoding)
codec: 'h264'

// VP8 (WebM, good for web)
codec: 'vp8'

// VP9 (WebM, better compression, slower)
codec: 'vp9'

// ProRes (high quality, large files)
codec: 'prores'
```

## Performance Optimization

### Memoization

Prevent unnecessary re-renders with memoization:

```tsx
import { memo } from 'react';

interface SlideProps {
  title: string;
  subtitle: string;
}

export const Slide = memo(({ title, subtitle }: SlideProps) => {
  return (
    <div style={{ padding: 40 }}>
      <h1>{title}</h1>
      <h2>{subtitle}</h2>
    </div>
  );
});
```

### Heavy Computations

Use `useMemo` for expensive calculations:

```tsx
import { useMemo, useCurrentFrame } from 'remotion';

export const ComplexChart = ({ data }: { data: number[] }) => {
  const frame = useCurrentFrame();

  const processedData = useMemo(() => {
    // Expensive computation
    return data.map(value => value * 2).sort();
  }, [data]);

  return <div>{processedData.join(', ')}</div>;
};
```

### Lazy Loading Components

Split large compositions into lazy-loaded modules:

```tsx
import { lazy, Suspense } from 'react';

const HeavySection = lazy(() => import('./HeavySection'));

export const MyVideo = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavySection />
    </Suspense>
  );
};
```

## Advanced Patterns

### Using External Libraries

Integrate charts, three.js, and other libraries. Most React libraries work seamlessly:

**Chart Example:**
```tsx
import { PieChart, BarChart } from 'react-chartjs-2';

export const ChartVideo = () => {
  const chartData = {
    labels: ['A', 'B', 'C'],
    datasets: [
      {
        label: 'Dataset',
        data: [12, 19, 3],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      },
    ],
  };

  return (
    <div style={{ padding: 40 }}>
      <BarChart data={chartData} />
    </div>
  );
};
```

**Three.js Integration:**
```tsx
import { Canvas } from '@react-three/fiber';
import { Box, OrbitControls } from '@react-three/drei';

export const ThreeJSScene = () => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas>
        <Box args={[1, 1, 1]} position={[0, 0, 0]}>
          <meshBasicMaterial color="orange" />
        </Box>
        <OrbitControls autoRotate />
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  );
};
```

**Note:** Test library compatibility with Remotion's browser environment. Some DOM-heavy libraries may need configuration.

### Conditional Rendering Based on Frame

Show/hide elements at specific times:

```tsx
export const ConditionalSequence = () => {
  const frame = useCurrentFrame();

  return (
    <>
      {frame < 60 && <Intro />}
      {frame >= 60 && frame < 180 && <MainContent />}
      {frame >= 180 && <Outro />}
    </>
  );
};
```

### Custom Hooks for Composition Logic

Extract reusable composition logic:

```tsx
function useAnimatedValue(
  from: number,
  to: number,
  startFrame: number,
  durationFrames: number
) {
  const frame = useCurrentFrame();

  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [from, to],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
}

// Usage:
const opacity = useAnimatedValue(0, 1, 0, 30);
const scale = useAnimatedValue(0.8, 1, 0, 30);
```

## Common Patterns

### Title Sequence

```tsx
export const TitleSequence = ({ title, duration = 120 }) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const titleScale = interpolate(
    frame,
    [0, 30],
    [0.8, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 72,
          color: '#fff',
          fontWeight: 'bold',
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
};
```

### Slideshow

```tsx
interface Slide {
  title: string;
  content: string;
  duration: number;
}

export const Slideshow = ({ slides }: { slides: Slide[] }) => {
  let currentFrame = 0;

  return (
    <>
      {slides.map((slide, index) => (
        <Sequence
          key={index}
          from={currentFrame}
          durationInFrames={slide.duration}
        >
          <SlideComponent title={slide.title} content={slide.content} />
        </Sequence>
      ))}
    </>
  );
};
```

### Ken Burns Effect (Zoom & Pan)

```tsx
export const KenBurnsEffect = ({ imageSrc }: { imageSrc: string }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panX = interpolate(frame, [0, durationInFrames], [0, 50], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      <img
        src={imageSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${panX}px)`,
        }}
      />
    </div>
  );
};
```

## Project Setup

### Creating a Remotion Project

```bash
npx create-remotion app my-video
cd my-video
npm install
npm run dev
```

### Configuration (remotion.config.ts)

```tsx
import { Config } from 'remotion';

Config.setFrameRange([0, 300]);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setFastMode(false);
Config.setQuality('high');
```

### Environment Variables

```env
# .env.local
REMOTION_BROWSER_LAUNCH_ARGS=--no-sandbox
REMOTION_FFMPEG_LOG_LEVEL=error
```

## Error Handling & Validation

### Input Validation

Validate composition props at the component level:

```tsx
interface VideoProps {
  title: string;
  duration?: number;
  fps?: number;
}

export const MyVideo: React.FC<VideoProps> = ({
  title,
  duration = 300,
  fps = 30,
}) => {
  // Validate critical inputs
  if (!title || title.trim().length === 0) {
    throw new Error('Title is required');
  }
  if (duration <= 0 || duration > 86400) { // Max 1 day
    throw new Error('Duration must be between 1 and 86400 frames');
  }
  if (![24, 30, 60].includes(fps)) {
    throw new Error('FPS must be 24, 30, or 60');
  }

  return (
    <div>
      <h1>{title}</h1>
    </div>
  );
};
```

### Asset Validation

Check asset existence before rendering:

```tsx
export const SafeImage = ({ src, fallback }: { src: string; fallback: string }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  return (
    <img
      src={error ? fallback : src}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      style={{
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.3s',
        width: '100%',
        height: '100%',
      }}
    />
  );
};
```

### Safe Rendering Wrapper

Wrap render calls with error boundaries:

```tsx
import { renderMedia, selectComposition } from '@remotion/renderer';

async function safeRender(compositionId: string, outputPath: string) {
  try {
    const composition = await selectComposition({
      serveUrl: 'http://localhost:3000',
      id: compositionId,
    });

    if (!composition) {
      throw new Error(`Composition "${compositionId}" not found`);
    }

    const result = await renderMedia({
      composition,
      serveUrl: 'http://localhost:3000',
      outputLocation: outputPath,
    });

    console.log('Render succeeded:', result);
    return result;
  } catch (error) {
    console.error('Render failed:', error);
    throw error;
  }
}
```

## Testing Compositions

### Unit Testing Components

Test composition components like regular React components:

```tsx
import { render } from '@testing-library/react';
import { MyVideo } from './MyVideo';

describe('MyVideo', () => {
  it('renders with default props', () => {
    const { container } = render(<MyVideo title="Test" />);
    expect(container.textContent).toContain('Test');
  });

  it('throws error on empty title', () => {
    expect(() => <MyVideo title="" />).toThrow();
  });
});
```

### Testing Animation Values

Test interpolation and animation logic:

```tsx
import { interpolate } from 'remotion';

describe('animations', () => {
  it('interpolates correctly', () => {
    const value = interpolate(15, [0, 30], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    expect(value).toBe(50); // Halfway point
  });

  it('clamps values outside range', () => {
    const tooSmall = interpolate(-10, [0, 100], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    expect(tooSmall).toBe(0);
  });
});
```

### Testing Render Output

Use Remotion's test utilities:

```tsx
import { expect, it } from 'vitest';
import { expectToThrow } from '@remotion/expect';
import { MyVideo } from './MyVideo';

it('should render without errors', async () => {
  await expectToThrow(async () => {
    await expect(<MyVideo title="Valid" duration={300} />).resolves.toBeTruthy();
  });
});
```

## Debugging & Troubleshooting

### Frame Counting Issues

Always verify frame calculations:

```tsx
const { fps, durationInFrames } = useVideoConfig();
const frame = useCurrentFrame();

console.log(`Frame: ${frame}/${durationInFrames} @ ${fps}fps`);
```

### Asset Loading Errors

- Verify paths are absolute (`/assets/image.png`, not `./image.png`)
- Check file extensions and MIME types
- Ensure assets exist in `public/` directory

### Audio Sync Issues

- Ensure audio sample rate matches project settings
- Use `startFrom` prop to offset audio if needed
- Test with shorter clips first

### Rendering Hangs

- Check browser console for errors
- Verify composition doesn't have infinite loops
- Reduce complexity in development, use lazy loading

## Best Practices for Large-Scale Projects

### Composition Structure & Reusability

Organize compositions into modular, reusable components:

```tsx
// compositions/layout.tsx - Reusable layout wrapper
interface LayoutProps {
  children: React.ReactNode;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

export const VideoLayout: React.FC<LayoutProps> = ({
  children,
  backgroundColor = '#000',
  width = 1920,
  height = 1080,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor, width, height }}>
      {children}
    </AbsoluteFill>
  );
};

// compositions/scenes/TitleScene.tsx - Reusable scene
interface TitleSceneProps {
  title: string;
  subtitle: string;
  duration: number;
}

export const TitleScene: React.FC<TitleSceneProps> = ({
  title,
  subtitle,
  duration,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ opacity: fadeIn, padding: 60 }}>
      <h1>{title}</h1>
      <h2>{subtitle}</h2>
    </div>
  );
};
```

### Configuration Management

Keep rendering configs centralized:

```tsx
// config/render.ts
export const RENDER_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  codec: 'h264' as const,
  pixelFormat: 'yuv420p' as const,
  quality: 'high' as const,
} as const;

export const COMPOSITION_CONFIG = {
  defaultDuration: 300,
  defaultFps: 30,
} as const;
```

### File Organization

Suggested structure for larger projects:

```
src/
  compositions/
    Root.tsx          # Main composition registry
    scenes/
      TitleScene.tsx
      MainScene.tsx
    components/
      Header.tsx
      Footer.tsx
      Effects/
        FadeIn.tsx
        Bounce.tsx
    utils/
      animations.ts
      timing.ts
  config/
    render.ts
    timings.ts
  tests/
    animations.test.ts
```

### Memory Management

For compositions with many assets or state:

```tsx
export const HeavyComposition: React.FC<Props> = ({ items }) => {
  // Memoize expensive computations
  const processed = useMemo(() => {
    return items.map(item => expensiveTransform(item));
  }, [items]);

  // Cleanup on unmount for any subscriptions
  useEffect(() => {
    return () => {
      // Cleanup code
    };
  }, []);

  // Limit re-renders with custom comparison
  return (
    <>
      {processed.map((item, i) => (
        <Scene key={i} data={item} />
      ))}
    </>
  );
};
```

## Resources

- [Remotion Documentation](https://remotion.dev/docs)
- [Remotion Examples & Showcase](https://remotion.dev/showcase)
- [FFmpeg Docs](https://ffmpeg.org/ffmpeg.html) (for codec options)
- [React Hooks API](https://react.dev/reference/react)
- [Remotion Performance Guide](https://remotion.dev/docs/performance)
