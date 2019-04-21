import * as R from 'ramda';
import React, { Component } from 'react';

const getStateManagerContainer = () => {
  const createSimpleStateManager = () => {
    const notifyFns = [];
    let notifiedCalledAtLeastOnce = false;
    let lastNotification = {
      data: null,
      error: null,
      loading: false
    };

    const subscribe = notifyFn => {
      notifyFns.push(notifyFn);

      if (notifiedCalledAtLeastOnce) {
        notifyFn(lastNotification);
      }

      const unsubscribe = () => {
        const indexOfNotifyFn = notifyFns.indexOf(notifyFn);

        if (~indexOfNotifyFn) {
          notifyFns.splice(indexOfNotifyFn, 1);
        }
      };

      return unsubscribe;
    };

    const notify = notification => {
      notifiedCalledAtLeastOnce = true;
      lastNotification = notification;
      notifyFns.forEach(notifyFn => notifyFn(notification));
    };

    /*
    TODO: queue updates?
    */
    const asyncUpdate = async fn => {
      notify(R.merge(lastNotification, { loading: true, error: null }));

      try {
        const updatedData = R.merge(lastNotification.data || {}, await fn());
        notify(
          R.merge(lastNotification, { loading: false, error: null, data: updatedData })
        );
      } catch (error) {
        notify(R.merge(lastNotification, { loading: false, error }));
      }
    };

    const syncUpdate = data => {
      try {
        const updatedData = R.merge(lastNotification.data || {}, data);
        notify(
          R.merge(lastNotification, { loading: false, error: null, data: updatedData })
        );
      } catch (error) {
        notify(R.merge(lastNotification, { loading: false, error }));
      }
    };

    const clearData = () => {
      notify(R.merge(lastNotification, { loading: false, error: null, data: null }));
    };

    return {
      asyncUpdate,
      clearData,
      getCurrentState: () => lastNotification,
      isLoading: () => lastNotification.loading,
      getData: () => lastNotification.data,
      getError: () => lastNotification.error,
      syncUpdate,
      subscribe
    };
  };

  const STATE_MANAGERS_CACHE = {};

  const withStateManagers = ({ WrappedComponent, stateManagerNames }) => {
    const STATE_MANAGERS = R.map(
      name => ({ name, manager: getStateManager({ name }) }),
      stateManagerNames
    );

    // ...and returns another component...
    const WrappedWithStateManagers = class WrappedWithStateManagers extends Component {
      constructor(props) {
        super(props);

        this.UNSUB_FUNCTIONS = [];
      }

      componentDidMount() {
        // ... that takes care of the subscription...
        R.forEach(({ manager }) => {
          this.UNSUB_FUNCTIONS.push(
            manager.subscribe(() => {
              this.setState({});
            })
          );
        }, STATE_MANAGERS);
      }

      componentWillUnmount() {
        R.forEach(unsubFn => unsubFn(), this.UNSUB_FUNCTIONS);
      }

      render() {
        // ... and renders the wrapped component with the fresh data!
        // Notice that we pass through any additional props
        return (
          <WrappedComponent
            stateManagers={R.fromPairs(
              R.map(({ name, manager }) => {
                return [ name, manager ];
              }, STATE_MANAGERS)
            )}
            {...this.props}
          />
        );
      }
    };

    return WrappedWithStateManagers;
  };

  const getStateManager = ({ name }) => {
    if (!STATE_MANAGERS_CACHE[name]) {
      STATE_MANAGERS_CACHE[name] = createSimpleStateManager();
    }

    return STATE_MANAGERS_CACHE[name];
  };

  return { getStateManager, withStateManagers };
};
export { getStateManagerContainer };
