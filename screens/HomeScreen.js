import React from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebBrowser } from 'expo';
import bluebird from 'bluebird';
import Buffer from 'buffer';
import * as R from 'ramda';
import { MonoText } from '../components/StyledText';

const logToConsole = global.console['log'];

export default class HomeScreen extends React.Component {
    static navigationOptions = {
      header: null
    };

    state = {};

    constructor() {
      super();
    }

    /*
    async checkBLEPermission() {
      const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
      return status === 'granted';
    }
    */

    scanAndConnect() {
      console.log('I AM SCANNING');
      this.manager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          console.log({ error });
          // Handle error (scanning will be stopped automatically)
          return;
        }

        const printableDevice = R.pick(
          [
            'id',
            'isConnectable',
            'localName',
            'manufacturerData',
            'mtu',
            'name',
            'overflowServiceUUIDs',
            'rssi',
            'serviceData',
            'serviceUUIDs',
            'solicitedServiceUUIDs',
            'txPowerLevel'
          ],
          device
        );
        logToConsole({ printableDevice });

        // Check if it is a device you are looking for based on advertisement data
        // or other criteria.
        if (device.name === 'ELK-BLEDOM ') {
          // Stop scanning as it's not necessary if you are scanning for one device.
          logToConsole('Stopping scan');
          await this.manager.stopDeviceScan();

          const attemptConnection = async () => {
            try {
              logToConsole('TESTING');
              const testDevice = await this.manager.connectToDevice(device.id, {
                timeout: 5000
              });
              return testDevice;

              // Proceed with connection
            } catch (err) {
              logToConsole('SOME ERROR WHEN MESSING WITH BLE', { err });
              return null;
            }
          };

          let testDevice = null;
          while (testDevice === null) {
            testDevice = await attemptConnection();
            if (testDevice === null) {
              await bluebird.delay(500);
            }
          }

          try {
            logToConsole('CONNECTED, GETTING SERVICES');
            const servicesAndCharacteristics = await testDevice.discoverAllServicesAndCharacteristics();
            const services = await servicesAndCharacteristics.services();

            //const desiredServiceId = '0000fff0-0000-1000-8000-00805f9b34fb';
            const desiredCharId = '0000fff3-0000-1000-8000-00805f9b34fb';
            let desiredChar = null;

            for (const service of services) {
              const characteristics = await service.characteristics();
              logToConsole('SERVICE: ', R.pick([ 'id', 'uuid', 'deviceId' ], service));
              for (const char of characteristics) {
                logToConsole(
                  'CHARACTERISTIC: ',
                  R.pick([ 'id', 'uuid', 'serviceID', 'value' ], char)
                );
                if (char.uuid === desiredCharId) {
                  desiredChar = char;
                }
              }
            }

            if (desiredChar === null) {
              logToConsole('Could not find matching characteristic');
            } else {
              const colorsHexString = [
                '7e070503ffff0000ef',
                '7e07050300ffff00ef',
                '7e070503ff00ff00ef'
              ];
              let counter = 0;
              let timeBetweenChanges = 200;
              const changeLight = async () => {
                const base64String = Buffer.Buffer.from(
                  colorsHexString[counter++ % colorsHexString.length],
                  'hex'
                ).toString('base64');
                const startTime = new Date();
                await desiredChar.writeWithResponse(base64String);
                const timeToWrite = new Date() - startTime;
                const timeToWait = timeBetweenChanges - timeToWrite;
                const beforeWait = new Date();
                setBGTimeout(() => {
                  logToConsole({
                    timeToWrite,
                    timeToWait,
                    timeWaited: new Date() - beforeWait
                  });
                  changeLight();
                }, timeToWait);
              };
              changeLight();
            }
          } catch (err) {
            logToConsole('ERROR AFTER CONNECTION', err);
          }
        }
      });
    }

    render() {
      return (
        <View style={styles.container}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.welcomeContainer}>
              <Image
                source={
                  __DEV__
                    ? require('../assets/images/robot-dev.png')
                    : require('../assets/images/robot-prod.png')
                }
                style={styles.welcomeImage}
              />
            </View>

            <View style={styles.getStartedContainer}>
              {this._maybeRenderDevelopmentModeWarning()}

              <Text style={styles.getStartedText}>Get started by opening</Text>

              <View style={[ styles.codeHighlightContainer, styles.homeScreenFilename ]}>
                <MonoText style={styles.codeHighlightText}>
                                screens/HomeScreen.js
                </MonoText>
              </View>

              <Text style={styles.getStartedText}>
                            Change this text and your app will automatically reload. OK WILL DO
                            AGAIN AND AGAIN
              </Text>
            </View>

            <View style={styles.helpContainer}>
              <TouchableOpacity onPress={this._handleHelpPress} style={styles.helpLink}>
                <Text style={styles.helpLinkText}>
                                Help, it didn’t automatically reload!
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.tabBarInfoContainer}>
            <Text style={styles.tabBarInfoText}>
                        This is a tab bar. You can edit it in:
            </Text>

            <View style={[ styles.codeHighlightContainer, styles.navigationFilename ]}>
              <MonoText style={styles.codeHighlightText}>
                            navigation/MainTabNavigator.js
              </MonoText>
            </View>
          </View>
        </View>
      );
    }

    _maybeRenderDevelopmentModeWarning() {
      if (__DEV__) {
        const learnMoreButton = (
          <Text onPress={this._handleLearnMorePress} style={styles.helpLinkText}>
                    Learn more
          </Text>
        );

        return (
          <Text style={styles.developmentModeText}>
                    Development mode is enabled, your app will be slower but you can use useful
                    development tools. {learnMoreButton}
          </Text>
        );
      } else {
        return (
          <Text style={styles.developmentModeText}>
                    You are not in development mode, your app will run at full speed.
          </Text>
        );
      }
    }

    _handleLearnMorePress = () => {
      WebBrowser.openBrowserAsync(
        'https://docs.expo.io/versions/latest/guides/development-mode'
      );
    };

    _handleHelpPress = () => {
      WebBrowser.openBrowserAsync(
        'https://docs.expo.io/versions/latest/guides/up-and-running.html#can-t-see-your-changes'
      );
    };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  developmentModeText: {
    marginBottom: 20,
    color: 'rgba(0,0,0,0.4)',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
  },
  contentContainer: {
    paddingTop: 30
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20
  },
  welcomeImage: {
    width: 100,
    height: 80,
    resizeMode: 'contain',
    marginTop: 3,
    marginLeft: -10
  },
  getStartedContainer: {
    alignItems: 'center',
    marginHorizontal: 50
  },
  homeScreenFilename: {
    marginVertical: 7
  },
  codeHighlightText: {
    color: 'rgba(96,100,109, 0.8)'
  },
  codeHighlightContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    paddingHorizontal: 4
  },
  getStartedText: {
    fontSize: 17,
    color: 'rgba(96,100,109, 1)',
    lineHeight: 24,
    textAlign: 'center'
  },
  tabBarInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3
      },
      android: {
        elevation: 20
      }
    }),
    alignItems: 'center',
    backgroundColor: '#fbfbfb',
    paddingVertical: 20
  },
  tabBarInfoText: {
    fontSize: 17,
    color: 'rgba(96,100,109, 1)',
    textAlign: 'center'
  },
  navigationFilename: {
    marginTop: 5
  },
  helpContainer: {
    marginTop: 15,
    alignItems: 'center'
  },
  helpLink: {
    paddingVertical: 15
  },
  helpLinkText: {
    fontSize: 14,
    color: '#2e78b7'
  }
});
