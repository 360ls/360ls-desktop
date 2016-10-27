import React from 'react';
import { lightBlueA400 } from 'material-ui/styles/colors';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import injectTapEventPlugin from 'react-tap-event-plugin';
import Navbar from '../components/Navbar';

injectTapEventPlugin();

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: lightBlueA400,
  },
  appBar: {
    height: 50,
  },
});

export default function App(props) {
  return (
    <MuiThemeProvider muiTheme={muiTheme}>
      <div>
        <Navbar />
        {props.children}
      </div>
    </MuiThemeProvider>
  );
}

App.propTypes = {
  children: React.PropTypes.element.isRequired,
};
