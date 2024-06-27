import React from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { Box, Flex, Button, Heading, List, ListItem } from '@chakra-ui/react';
import AddPage from './components/AddPage';
import MovePage from './components/MovePage';
import ViewPage from './components/ViewPage';

export default function App() {
  return (
    <Box className="App">
      <Flex as="nav" bg="teal.500" p={4} color="white" justifyContent="center">
        <List display="flex" styleType="none">
          <ListItem mx={2}><Link to="/">Home</Link></ListItem>
          <ListItem mx={2}><Link to="/add">Add</Link></ListItem>
          <ListItem mx={2}><Link to="/move">Move</Link></ListItem>
          <ListItem mx={2}><Link to="/view">View</Link></ListItem>
        </List>
      </Flex>
      <Box p={4}>
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/move" element={<MovePage />} />
          <Route path="/view" element={<ViewPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

function Home() {
  return (
    <Box textAlign="center" mt={8}>
      <Heading>Home Page</Heading>
      <p>Welcome! Choose an option:</p>
      <List styleType="none" mt={4}>
        <ListItem><Button as={Link} to="/add" colorScheme="teal" mt={2}>Add</Button></ListItem>
        <ListItem><Button as={Link} to="/move" colorScheme="teal" mt={2}>Move</Button></ListItem>
        <ListItem><Button as={Link} to="/view" colorScheme="teal" mt={2}>View</Button></ListItem>
      </List>
    </Box>
  );
}
