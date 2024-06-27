import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.render(
  <ChakraProvider>
    <Router>
      <App />
    </Router>
  </ChakraProvider>,
  document.getElementById('root')
);
