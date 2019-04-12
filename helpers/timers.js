import * as R from 'ramda';
import BackgroundTimer from 'react-native-background-timer';

let timeouts = [];

const setBGTimeout = (cb, ms) => {
  if (timeouts.length === 0) {
    BackgroundTimer.runBackgroundTimer(backgroundTimerRunner, 0);
  }

  timeouts.push({ cb, ms, start: Date.now() });
};

const backgroundTimerRunner = () => {
  const now = Date.now();
  const findTimeoutsThatShouldFire = ({ start, ms }) => ms < now - start;

  const timeoutsThatShouldFire = R.filter(findTimeoutsThatShouldFire, timeouts);

  timeouts = R.reject(findTimeoutsThatShouldFire, timeouts);

  timeoutsThatShouldFire.forEach(({ cb }) => cb());

  if (timeouts.length === 0) {
    BackgroundTimer.stopBackgroundTimer();
  }
};

export { setBGTimeout };
