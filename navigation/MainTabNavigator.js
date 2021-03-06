import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator, createBottomTabNavigator, Header } from 'react-navigation';

import TabBarIcon from '../components/TabBarIcon';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BluetoothScreen from '../screens/BluetoothScreen';

const headerDefaultNavigationConfig = {
  header: props => {
    console.log('I AM HERE');
    console.log({ props });
    return <Header {...props} />;
  },
  title: 'Home',
  headerStyle: {
    backgroundColor: 'transparent'
  },
  headerTitleStyle: {
    fontWeight: 'bold',
    color: '#fff',
    zIndex: 1,
    fontSize: 18,
    lineHeight: 23
  },
  headerTintColor: '#fff'
};

const HomeStack = createStackNavigator(
  {
    Home: HomeScreen
  },
  {
    navigationOptions: {},
    defaultNavigationOptions: {
      tabBarLabel: 'Home',
      tabBarIcon: ({ focused }) => (
        <TabBarIcon
          focused={focused}
          name={
            Platform.OS === 'ios'
              ? `ios-information-circle${focused ? '' : '-outline'}`
              : 'md-information-circle'
          }
        />
      )
    }
  }
);

const BluetoothStack = createStackNavigator(
  {
    Links: BluetoothScreen
  },
  {
    defaultNavigationOptions: {
      header: props => {
        console.log('I AM HERE');
        console.log({ props });
        return <Header {...props} />;
      }
    }
  }
);

BluetoothStack.navigationOptions = {
  tabBarLabel: 'Bluetooth!',
  tabBarIcon: ({ focused }) => (
    <TabBarIcon
      focused={focused}
      name={Platform.OS === 'ios' ? 'ios-bluetooth' : 'md-bluetooth'}
    />
  )
};

const SettingsStack = createStackNavigator({
  Settings: SettingsScreen
});

SettingsStack.navigationOptions = {
  tabBarLabel: 'Settings',
  tabBarIcon: ({ focused }) => (
    <TabBarIcon
      focused={focused}
      name={Platform.OS === 'ios' ? 'ios-options' : 'md-options'}
    />
  ),
  ...headerDefaultNavigationConfig
};

export default createBottomTabNavigator({
  BluetoothStack,
  HomeStack,
  SettingsStack
});
