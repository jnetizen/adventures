import { useState, useEffect, useRef, useCallback } from 'react';
import type { SeekerLensInstructions, SeekerDirection } from '../types/adventure';

interface SeekerLensPuzzleProps {
  instructions: SeekerLensInstructions;
  onComplete: (success: boolean) => void;
  sceneImageUrl?: string;
}

// Direction detection thresholds
const detectDirection = (beta: number, gamma: number, tolerance: number): SeekerDirection | null => {
  // beta: front-back tilt (-180 to 180), 0 = vertical
  // gamma: left-right tilt (-90 to 90)

  const threshold = 90 - tolerance;

  if (beta > threshold) return 'up';           // tilted back -> ceiling
  if (beta < -threshold + 90) return 'down';   // tilted forward -> floor
  if (gamma > 45) return 'right';
  if (gamma < -45) return 'left';
  if (Math.abs(beta) < 30 && Math.abs(gamma) < 30) {
    return 'flat-face-up';
  }
  return null;
};

// Calculate "warmth" (how close to target direction, 0-1)
const calculateWarmth = (
  beta: number,
  gamma: number,
  targetDirection: SeekerDirection
): number => {
  let angleDiff = 180; // max distance

  switch (targetDirection) {
    case 'up':
      angleDiff = Math.abs(90 - beta);
      break;
    case 'down':
      angleDiff = Math.abs(-90 - beta);
      break;
    case 'left':
      angleDiff = Math.abs(-90 - gamma);
      break;
    case 'right':
      angleDiff = Math.abs(90 - gamma);
      break;
    case 'flat-face-up':
      angleDiff = Math.sqrt(beta * beta + gamma * gamma);
      break;
    case 'flat-face-down':
      angleDiff = Math.abs(180 - Math.abs(beta));
      break;
  }

  // Convert to 0-1 warmth (1 = on target, 0 = far away)
  const maxAngle = 90;
  return Math.max(0, 1 - (angleDiff / maxAngle));
};

export default function SeekerLensPuzzle({
  instructions,
  onComplete,
  sceneImageUrl: _sceneImageUrl,
}: SeekerLensPuzzleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Start as 'waiting' - need user gesture before requesting permissions on iOS
  const [permissionStatus, setPermissionStatus] = useState<'waiting' | 'requesting' | 'granted' | 'denied' | 'unavailable'>('waiting');
  const [warmth, setWarmth] = useState(0);
  const [objectVisible, setObjectVisible] = useState(false);  // Shows/hides as you move
  const [objectTapped, setObjectTapped] = useState(false);

  const tolerance = instructions.directionToleranceDegrees ?? 35;
  const targetDirection = instructions.triggerDirection;

  // Helper to stop the camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Request all permissions - MUST be called from a user gesture (tap/click)
  const requestPermissions = useCallback(async () => {
    console.log('[SeekerLens] === Starting permission request ===');
    console.log('[SeekerLens] User agent:', navigator.userAgent);
    setPermissionStatus('requesting');

    // Check if DeviceOrientationEvent is available
    console.log('[SeekerLens] DeviceOrientationEvent in window:', 'DeviceOrientationEvent' in window);
    if (!('DeviceOrientationEvent' in window)) {
      console.warn('[SeekerLens] DeviceOrientationEvent not available - setting unavailable');
      setPermissionStatus('unavailable');
      return;
    }

    // iOS 13+ requires explicit permission request FROM A USER GESTURE
    const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    console.log('[SeekerLens] requestPermission function exists:', typeof DeviceOrientationEventTyped.requestPermission === 'function');

    if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
      try {
        console.log('[SeekerLens] Requesting motion permission...');
        const permission = await DeviceOrientationEventTyped.requestPermission();
        console.log('[SeekerLens] Motion permission result:', permission);
        if (permission !== 'granted') {
          console.error('[SeekerLens] Motion permission denied - user declined');
          setPermissionStatus('denied');
          return;
        }
        console.log('[SeekerLens] Motion permission granted!');
      } catch (err) {
        console.error('[SeekerLens] Gyroscope permission error:', err);
        console.error('[SeekerLens] Error name:', (err as Error)?.name);
        console.error('[SeekerLens] Error message:', (err as Error)?.message);
        setPermissionStatus('denied');
        return;
      }
    } else {
      console.log('[SeekerLens] No requestPermission function - assuming motion allowed (non-iOS or older)');
    }

    // Now request camera
    console.log('[SeekerLens] Requesting camera permission...');
    console.log('[SeekerLens] navigator.mediaDevices exists:', !!navigator.mediaDevices);
    console.log('[SeekerLens] getUserMedia exists:', !!navigator.mediaDevices?.getUserMedia);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },  // Back camera for "searching the room"
        audio: false,
      });
      console.log('[SeekerLens] Camera stream obtained:', stream);
      console.log('[SeekerLens] Video tracks:', stream.getVideoTracks().length);

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('[SeekerLens] Stream attached to video element');

        // iOS Safari needs explicit play() call
        try {
          await videoRef.current.play();
          console.log('[SeekerLens] Video playing');
        } catch (playErr) {
          console.warn('[SeekerLens] Video play() failed, may autoplay anyway:', playErr);
        }
      }
      console.log('[SeekerLens] === All permissions granted! ===');
      setPermissionStatus('granted');
    } catch (err) {
      console.error('[SeekerLens] Camera error:', err);
      console.error('[SeekerLens] Error name:', (err as Error)?.name);
      console.error('[SeekerLens] Error message:', (err as Error)?.message);
      setPermissionStatus('denied');
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Listen to device orientation
  useEffect(() => {
    if (permissionStatus !== 'granted') return;

    let logCounter = 0;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const newBeta = event.beta ?? 0;
      const newGamma = event.gamma ?? 0;

      const detected = detectDirection(newBeta, newGamma, tolerance);
      const newWarmth = calculateWarmth(newBeta, newGamma, targetDirection);
      setWarmth(newWarmth);

      // Log every 30th event to avoid spam (roughly every second)
      logCounter++;
      if (logCounter % 30 === 0) {
        console.log(`[SeekerLens] Orientation: beta=${newBeta.toFixed(1)}, gamma=${newGamma.toFixed(1)}, detected=${detected}, target=${targetDirection}, warmth=${newWarmth.toFixed(2)}`);
      }

      // Show object when pointing at target, hide when moving away
      const isOnTarget = detected === targetDirection;
      if (isOnTarget !== objectVisible) {
        console.log(`[SeekerLens] Object visibility changed: ${isOnTarget ? 'VISIBLE' : 'hidden'}`);
      }
      setObjectVisible(isOnTarget);
    };

    console.log('[SeekerLens] Starting orientation listener, target direction:', targetDirection);
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      console.log('[SeekerLens] Stopping orientation listener');
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionStatus, tolerance, targetDirection, objectVisible]);

  // Handle object tap
  const handleObjectTap = useCallback(() => {
    if (!objectVisible || objectTapped) return;
    setObjectTapped(true);

    // Stop the camera immediately
    stopCamera();

    // Small delay for celebration animation, then complete
    setTimeout(() => {
      onComplete(true);
    }, 1500);
  }, [objectVisible, objectTapped, onComplete, stopCamera]);

  // Get warmth color for border
  const getWarmthColor = () => {
    if (warmth < 0.3) return 'border-blue-500';
    if (warmth < 0.6) return 'border-yellow-500';
    if (warmth < 0.85) return 'border-orange-500';
    return 'border-red-500';
  };


  // Waiting for user to tap - iOS requires permissions to be requested from user gesture
  if (permissionStatus === 'waiting') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-900 to-purple-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-6">
          <span role="img" aria-label="magic lens">&#x1F52E;</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Seeker's Lens</h2>
        <p className="text-purple-200 mb-8">{instructions.setupNarration}</p>
        <button
          onClick={requestPermissions}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all"
        >
          Activate the Lens!
        </button>
      </div>
    );
  }

  // Requesting permissions
  if (permissionStatus === 'requesting') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-900 to-purple-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-6">
          <span role="img" aria-label="magic lens">&#x1F52E;</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Seeker's Lens</h2>
        <p className="text-purple-200 mb-8">{instructions.setupNarration}</p>
        <div className="animate-pulse text-purple-300">
          Activating magical lens...
        </div>
      </div>
    );
  }

  // Permission denied / unavailable - fallback UI
  if (permissionStatus === 'denied' || permissionStatus === 'unavailable') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-900 to-purple-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-6">
          <span role="img" aria-label="magic lens">&#x1F52E;</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Seeker's Lens</h2>
        <p className="text-purple-200 mb-4">{instructions.setupNarration}</p>
        <div className="bg-red-500/20 border border-red-400 rounded-lg p-4 mb-6">
          <p className="text-red-200 text-sm">
            {permissionStatus === 'denied'
              ? 'Camera or motion sensors not available. Ask your DM to help!'
              : 'This device doesn\'t support the Seeker\'s Lens. Ask your DM to help!'}
          </p>
        </div>
        <button
          onClick={() => onComplete(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg"
        >
          DM Found It For Me!
        </button>
      </div>
    );
  }

  // Object found celebration
  if (objectTapped) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-amber-400 to-orange-500 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-8xl mb-6 animate-bounce">
          <span role="img" aria-label="celebration">&#x1F389;</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">You Found {instructions.hiddenObject.name}!</h2>
        <p className="text-amber-100 text-lg">{instructions.successNarration}</p>
      </div>
    );
  }

  // Main puzzle UI
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Camera feed - use z-index to ensure it's on top */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        webkit-playsinline="true"
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{
          backgroundColor: 'transparent',
          minWidth: '100%',
          minHeight: '100%',
        }}
        onLoadedMetadata={() => {
          console.log('[SeekerLens] Video metadata loaded');
          if (videoRef.current) {
            console.log('[SeekerLens] Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            // Force a re-render by triggering play again
            videoRef.current.play().catch(e => console.warn('[SeekerLens] Re-play failed:', e));
          }
        }}
        onCanPlay={() => {
          console.log('[SeekerLens] Video canPlay event');
          if (videoRef.current) {
            videoRef.current.play().catch(e => console.warn('[SeekerLens] Play on canPlay failed:', e));
          }
        }}
        onPlay={() => console.log('[SeekerLens] Video onPlay fired')}
        onError={(e) => console.error('[SeekerLens] Video error:', e)}
      />

      {/* Warmth indicator border - subtle glow around edges */}
      <div className={`absolute inset-0 border-8 ${getWarmthColor()} transition-colors duration-300 pointer-events-none z-20`} />

      {/* Hidden object (shown when direction matches) */}
      {objectVisible && (
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30"
          onClick={handleObjectTap}
        >
          <div className={`relative ${instructions.hiddenObject.animation === 'float-bounce' ? 'animate-bounce' : instructions.hiddenObject.animation === 'pulse' ? 'animate-pulse' : ''}`}>
            <img
              src={instructions.hiddenObject.imageUrl}
              alt={instructions.hiddenObject.name}
              className="w-32 h-32 object-contain drop-shadow-2xl"
              style={{
                width: instructions.hiddenObject.width ?? 128,
                height: instructions.hiddenObject.height ?? 128,
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.8))',
              }}
              onError={() => console.error('[SeekerLens] Hidden object image failed to load:', instructions.hiddenObject.imageUrl)}
            />
            {/* Tap prompt */}
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-white/90 px-4 py-2 rounded-full text-purple-900 font-bold animate-pulse">
                {instructions.tapPrompt}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reveal narration - only show when object is found */}
      {objectVisible && !objectTapped && (
        <div className="absolute top-8 left-4 right-4 z-30">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-white text-lg font-medium">{instructions.revealNarration}</p>
          </div>
        </div>
      )}

      {/* Minimal search prompt - no direction hints, let them explore! */}
      {!objectVisible && (
        <div className="absolute bottom-8 left-4 right-4 z-30">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-white text-lg">Move your iPad around to search...</p>
          </div>
        </div>
      )}
    </div>
  );
}
