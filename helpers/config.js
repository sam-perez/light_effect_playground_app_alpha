import * as stateManagerLib from './state_manager';

const STATE_MANAGER_NAMES = {
  SAVED_BLUETOOTH_BRACELETS: 'SAVED_BLUETOOTH_BRACELETS'
};

export default {
  stateManager: {
    STATE_MANAGER_NAMES,
    container: stateManagerLib.getStateManagerContainer()
  }
};
