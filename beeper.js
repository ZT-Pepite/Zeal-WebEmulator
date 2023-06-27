/**
 * SPDX-FileCopyrightText: 2023 Jason Mo <jasonmo2009@hotmail.com>
 * 
 * SPDX-License-Identifier: Apache-2.0
 */

/// examples:
///
/// playOscillator(440, 'sine', 2); //播放2秒的正弦波
///
/// setTimeout(function() {
///   playOscillator(440, 'sine', 2); //再次播放2秒的正弦波
/// }, 3000); //延迟3秒后执行

/// frequency map:
/// 262--C4  1
/// 294--D4  2
/// 330--E4  3
/// 349--F4  4
/// 392--G4  5
/// 440--A4  6
/// 494--B4  7
/// 523--C5  8

/// waveform list:
/// "sine"
/// "square"
/// "sawtooth"
/// "triangle"

var audioCtx = new AudioContext();

function beeper(frequency, wave, duration) {
    var oscillator = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = wave;
    gainNode.gain.value = 0.5;

    oscillator.start();

    oscillator.stop(audioCtx.currentTime + duration);
}

function beepnote(note, wave='sine', duration=0.5) {
    if (note == 1) {
        beeper(262, wave, duration);
    }
    else {
        if (note == 2) {
            beeper(294, wave, duration);
        }
        else {
            if (note == 3) {
                beeper(330, wave, duration);
            }
            else {
                if (note == 4) {
                    beeper(349, wave, duration);
                }
                else {
                    if (note == 5) {
                        beeper(392, wave, duration);
                    }
                    else {
                        if (note == 6) {
                            beeper(440, wave, duration);
                        }
                        else {
                            if (note == 7) {
                                beeper(494, wave, duration);
                            }
                            else if (note == 8) {
                                beeper(523, wave, duration);
                            }
                            else {
                                console.error("Error while playing the note \"%d\"", note)
                            }
                        }
                    }
                }
            }
        }
    }
}

function littlestar() {
    ltss1();
    setTimeout(function() {
        ltss2();
        setTimeout(function() {
            ltss3();
            setTimeout(function() {
                ltss3();
                setTimeout(function() {
                    ltss1();
                    setTimeout(function() {
                        ltss2();
                    }, 3500);
                }, 4500);
            }, 4000);
        }, 4000);
    }, 3500);
}

function ltss1() {
    beeper(262, 'sine', 0.5);
    setTimeout(function() {
        beeper(262, 'sine', 0.5);
        setTimeout(function() {
            beeper(392, 'sine', 0.5);
            setTimeout(function() {
                beeper(392, 'sine', 0.5);
                setTimeout(function() {
                    beeper(440, 'sine', 0.5);
                    setTimeout(function() {
                        beeper(440, 'sine', 0.5);
                        setTimeout(function() {
                            beeper(392, 'sine', 0.5);
                        }, 500);
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    }, 500);
}

function ltss2() {
    setTimeout(function() {
        beeper(349, 'sine', 0.5);
        setTimeout(function() {
            beeper(349, 'sine', 0.5);
            setTimeout(function() {
                beeper(330, 'sine', 0.5);
                setTimeout(function() {
                    beeper(330, 'sine', 0.5);
                    setTimeout(function() {
                        beeper(294, 'sine', 0.5);
                        setTimeout(function() {
                            beeper(294, 'sine', 0.5);
                            setTimeout(function() {
                                beeper(262, 'sine', 0.5);
                            }, 500);
                        }, 500);                                            
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    }, 500);
}

function ltss3() {
    setTimeout(function() {
        beeper(392, 'sine', 0.5);
        setTimeout(function() {
            beeper(392, 'sine', 0.5);
            setTimeout(function() {
                beeper(349, 'sine', 0.5);
                setTimeout(function() {
                    beeper(349, 'sine', 0.5);
                    setTimeout(function() {
                        beeper(330, 'sine', 0.5);
                        setTimeout(function() {
                            beeper(330, 'sine', 0.5);
                            setTimeout(function() {
                                beeper(294, 'sine', 0.5);
                            }, 500);
                        }, 500);
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    }, 500);
}
