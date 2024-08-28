import React, { useState, useEffect, createContext } from 'react';
import { Box, Flex, Button, Heading, List, ListItem } from '@chakra-ui/react';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import AddPage from './components/AddPage';
import MovePage from './components/MovePage';
import ViewPage from './components/ViewPage';
import GridMap from './components/GridMap';
import SearchPage from './components/SearchPage';
import PlacePage from './components/PlacePage'; // Import the new component

export const GridHighlightContext = createContext();

export default function App() {
  const [inventory, setInventory] = useState([]);
  const [highlightItem, setHighlightItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const response = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Inventory");
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    }
  };

  const handleAssignItem = async (item, cell) => {
    const updatedItem = { ...item, GridLocation: cell };

    try {
      const response = await fetch(
        `https://sheetdb.io/api/v1/26ca60uj6plvv/ID/${item.ID}?sheet=Inventory`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ GridLocation: cell })
        }
      );
      const data = await response.json();
      setInventory(prevInventory => prevInventory.map(i => (i.ID === item.ID ? updatedItem : i)));
    } catch (error) {
      console.error(`Error updating GridLocation for ID ${item.ID}:`, error);
    }
  };

  const handleSubmit = async (dataToSend) => {
    try {
      const response = await fetch(
        "https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dataToSend)
        }
      );
      const data = await response.json();
      console.log("Response for Update sheet:", data);
    } catch (error) {
      console.error("Error updating the Update sheet:", error);
    }

    // Update the specific row in the Inventory sheet based on the ID
    try {
      const response = await fetch(
        `https://sheetdb.io/api/v1/26ca60uj6plvv/ID/${dataToSend.ID}?sheet=Inventory`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            GridLocation: dataToSend.GridLocation,
            "Last updated": dataToSend.Date
          })
        }
      );
      const data = await response.json();
      console.log(`Response for updating ID ${dataToSend.ID}:`, data);
    } catch (error) {
      console.error(`Error updating the Inventory sheet for ID ${dataToSend.ID}:`, error);
    }
  };

  return (
    <GridHighlightContext.Provider value={{ highlightItem, setHighlightItem }}>
      <Box className="App">
        <Flex as="nav" bg="teal.500" p={4} color="white" justifyContent="center">
          <List display="flex" styleType="none">
            <ListItem mx={2}><Link to="/">Home</Link></ListItem>
            <ListItem mx={2}><Link to="/add">Add</Link></ListItem>
            <ListItem mx={2}><Link to="/move">Move</Link></ListItem>
            <ListItem mx={2}><Link to="/view">View</Link></ListItem>
            <ListItem mx={2}><Link to="/grid">Grid Map</Link></ListItem>
            <ListItem mx={2}><Link to="/search">Search</Link></ListItem>
            <ListItem mx={2}><Link to="/place">Place</Link></ListItem> {/* New tab added */}
          </List>
        </Flex>
        <Box p={4}>
          <Routes>
            <Route exact path="/" element={<Home />} />
            <Route path="/add" element={<AddPage />} />
            <Route path="/move" element={<MovePage />} />
            <Route path="/view" element={<ViewPage />} />
            <Route path="/grid" element={<GridMap items={inventory} onAssignItem={handleAssignItem} onSubmit={handleSubmit} />} />
            <Route path="/search" element={<SearchPage inventory={inventory} />} />
            <Route path="/place" element={<PlacePage />} /> {/* New route added */}
          </Routes>
        </Box>
      </Box>
    </GridHighlightContext.Provider>
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
        <ListItem><Button as={Link} to="/grid" colorScheme="teal" mt={2}>Grid Map</Button></ListItem>
        <ListItem><Button as={Link} to="/search" colorScheme="teal" mt={2}>Search</Button></ListItem>
        <ListItem><Button as={Link} to="/place" colorScheme="teal" mt={2}>Place</Button></ListItem>
      </List>
    </Box>
  );
}
