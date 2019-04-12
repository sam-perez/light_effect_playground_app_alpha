import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Button,
  FlatList,
  View,
  Text
} from 'react-native';
import * as R from 'ramda';
import bluebird from 'bluebird';
import Buffer from 'buffer';

import { BleManager } from 'react-native-ble-plx';

const BTManager = new BleManager();

const getBluetoothHelper = () => {
  const WRISTBAND_DEVICE_NAME = 'ELK-BLEDOM ';

  const collectAccessibleDevices = ({ msToScanFor }) => {
    const devices = {};

    const promiseResolvingWithDevices = new Promise(async (resolve, reject) => {
      BTManager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          reject(error);
          return;
        }

        // Check if it is a device you are looking for based on advertisement data
        // or other criteria.
        if (device.name === WRISTBAND_DEVICE_NAME) {
          devices[device.id] = device;
        }
      });

      await bluebird.delay(msToScanFor);
      BTManager.stopDeviceScan();

      resolve({ devices: R.values(devices) });
    });

    return promiseResolvingWithDevices;
  };

  return {
    getObservableDevices: ({ msToScanFor }) => {
      const observableDevicesPromise = new Promise((resolve, reject) => {
        const subscription = BTManager.onStateChange(async state => {
          try {
            if (state === 'PoweredOn') {
              subscription.remove();
              const { devices } = await collectAccessibleDevices({ msToScanFor });
              resolve({ devices });
            }
          } catch (error) {
            reject(error);
          }
        }, true);
      });

      return observableDevicesPromise;
    },
    connectToDevice: async ({ device, maxAttempts = 10 }) => {
      let connectedDevice = null;
      let attempts = 0;

      while (attempts <= maxAttempts) {
        attempts++;
        try {
          connectedDevice = await BTManager.connectToDevice(device.id, {
            timeout: 5000
          });
          await connectedDevice.discoverAllServicesAndCharacteristics();
          break;
        } catch (err) {
          // keep going
          console.log('CONNECTION ERROR', { err, attempts });
        }
      }

      return { connectedDevice };
    },
    writeColorToDevice: async ({ device, colorInHex }) => {
      const desiredServiceId = '0000fff0-0000-1000-8000-00805f9b34fb';
      const desiredCharId = '0000fff3-0000-1000-8000-00805f9b34fb';
      const commandToWrite = `7e070503${colorInHex}00ef`;

      const base64CommandToWrite = Buffer.Buffer.from(commandToWrite, 'hex').toString(
        'base64'
      );

      await BTManager.writeCharacteristicWithoutResponseForDevice(
        device.id,
        desiredServiceId,
        desiredCharId,
        base64CommandToWrite
      ).catch(err => {
        console.log('SOME ERROR WHILE WRITING COLOR', { err, colorInHex });
      });
    }
  };
};

const bluetoothHelper = getBluetoothHelper();

export default class BluetoothScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      devices: [],
      loadingDevices: false
    };
  }

  async scanForDevices() {
    this.setState({ loadingDevices: true });
    const { devices } = await bluetoothHelper.getObservableDevices({ msToScanFor: 5000 });

    this.setState({ devices, loadingDevices: false });
  }

  render() {
    const { devices, loadingDevices } = this.state;

    if (loadingDevices) {
      return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
      <ScrollView style={styles.container}>
        <Button
          onPress={() => {
            this.scanForDevices();
          }}
          title="Click here to scan for devices"
        />

        {devices.length === 0 ? (
          <Text>No matching devices found yet, scan for devices!</Text>
        ) : (
          <View>
            <FlatList
              data={R.map(
                device => ({
                  key: device.id,
                  device
                }),
                devices
              )}
              renderItem={({ item: { device } }) => (
                <LEDWristBandDeviceComponent style={styles.item} device={device} />
              )}
            />
          </View>
        )}
      </ScrollView>
    );
  }
}

class LEDWristBandDeviceComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      connected: false,
      connecting: false,
      failedToConnect: false
    };
  }

  renderConnectingState() {
    return (
      <View>
        <Text>Connecting...</Text>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  async connectToDevice() {
    this.setState({ connecting: true, connected: false, failedToConnect: false });

    const { connectedDevice } = await bluetoothHelper.connectToDevice({
      device: this.props.device
    });

    if (connectedDevice !== null) {
      this.setState({ connecting: false, connected: true, failedToConnect: false });
    } else {
      this.setState({ connecting: false, connected: false, failedToConnect: true });
    }
  }

  renderNotConnected({ failedToConnect }) {
    return (
      <View>
        {failedToConnect ? <Text>Could not connect, try again</Text> : null}
        <Button
          onPress={() => {
            this.connectToDevice();
          }}
          title="Connect to device"
        />
      </View>
    );
  }

  renderConnected() {
    return (
      <View>
        <Text>We are connected to the device!</Text>
        <Button
          onPress={() => {
            const randomColorInHex = Math.floor(Math.random() * 16777215).toString(16);
            bluetoothHelper.writeColorToDevice({
              device: this.props.device,
              colorInHex: randomColorInHex
            });
          }}
          title="Send random color command"
        />
      </View>
    );
  }

  render() {
    const { device } = this.props;
    const { connected, connecting, failedToConnect } = this.state;

    let innerState;

    if (connecting) {
      innerState = this.renderConnectingState();
    } else if (connected === false) {
      innerState = this.renderNotConnected({ failedToConnect });
    } else {
      innerState = this.renderConnected();
    }

    return (
      <View>
        <Text style={styles.item}>Device ID: {device.id}</Text>
        {innerState}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    backgroundColor: '#fff'
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44
  }
});
