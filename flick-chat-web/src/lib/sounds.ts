let callAudioInstance: HTMLAudioElement | null = null;

/**
 * Play message RECEIVED sound
 */
export const playMessageSound = () => {
  try {
    const audio = new Audio('/sounds/sent-notification-sound.mp3');
    audio.volume = 0.6;
    audio.play().catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Failed to play message sound:', err);
      }
    });
  } catch (e) {
    // Silent fail
  }
};

/**
 * Play message SENT sound
 */
export const playSentSound = () => {
  try {
    const audio = new Audio('/sounds/sent-notification-sound.mp3');
    audio.volume = 0.4;
    audio.play().catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Failed to play sent sound:', err);
      }
    });
  } catch (e) {
    // Silent fail
  }
};

/**
 * Play OUTGOING call sound (caller side)
 */
export const playOutgoingCallSound = (): HTMLAudioElement | null => {
  try {
    stopCallSound();
    
    const audio = new Audio('/sounds/phone-ring.mp3');
    audio.volume = 0.7;
    audio.loop = true;
    audio.play().catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Failed to play outgoing call sound:', err);
      }
    });
    
    callAudioInstance = audio;
    return audio;
  } catch (e) {
    return null;
  }
};

/**
 * Play INCOMING call sound (receiver side)
 */
export const playIncomingCallSound = (): HTMLAudioElement | null => {
  try {
    stopCallSound();
    
    const audio = new Audio('/sounds/incoming-call-ring.mp3');
    audio.volume = 0.7;
    audio.loop = true;
    audio.play().catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Failed to play incoming call sound:', err);
      }
    });
    
    callAudioInstance = audio;
    return audio;
  } catch (e) {
    return null;
  }
};

/**
 * Play call END sound
 */
export const playEndCallSound = () => {
  try {
    // Stop any ringtone first
    stopCallSound();
    
    // Wait a tiny bit for stopCallSound to complete
    setTimeout(() => {
      const audio = new Audio('/sounds/end-call.mp3');
      audio.volume = 0.6;
      audio.play().catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Failed to play end call sound:', err);
        }
      });
    }, 50);
  } catch (e) {
    // Silent fail
  }
};

/**
 * Stop call ringtone
 */
export const stopCallSound = () => {
  if (callAudioInstance) {
    try {
      callAudioInstance.pause();
      callAudioInstance.currentTime = 0;
    } catch (e) {
      // Silent fail
    }
    callAudioInstance = null;
  }
};
