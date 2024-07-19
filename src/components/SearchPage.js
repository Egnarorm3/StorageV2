import React, { useState, useContext, useEffect } from 'react';
import { Box, Input, Button, Heading, SimpleGrid, Image, Text, Flex, VStack } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { GridHighlightContext } from '../App';

export default function SearchPage({ inventory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [itemExistsInGrid, setItemExistsInGrid] = useState({});
  const [itemHighlightID, setItemHighlightID] = useState({});
  const navigate = useNavigate();
  const { setHighlightItem } = useContext(GridHighlightContext);

  useEffect(() => {
    const checkItemsInGrid = async () => {
      const response1 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room1");
      const data1 = await response1.json();

      const response2 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room2");
      const data2 = await response2.json();

      const response3 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room3");
      const data3 = await response3.json();

      const gridData = [...data1, ...data2, ...data3];
      const exists = {};
      const highlightID = {};

      inventory.forEach(item => {
        const itemInGrid = gridData.some(row => Object.values(row).some(cell => cell.includes(item.ID)));
        const shelfContainerInGrid = item.ShelfContainer ? gridData.some(row => Object.values(row).some(cell => cell.includes(item.ShelfContainer))) : false;

        if (itemInGrid) {
          exists[item.ID] = true;
          highlightID[item.ID] = item.ID;
        } else if (shelfContainerInGrid) {
          exists[item.ID] = true;
          highlightID[item.ID] = item.ShelfContainer;
        } else {
          exists[item.ID] = false;
          highlightID[item.ID] = null;
        }
      });

      setItemExistsInGrid(exists);
      setItemHighlightID(highlightID);
    };

    checkItemsInGrid();
  }, [inventory]);

  const handleSearch = () => {
    const results = inventory.filter(item => {
      const tags = item.Tags ? item.Tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
      const query = searchQuery.toLowerCase();
      return tags.some(tag => tag.includes(query)) || item.ID.toLowerCase().includes(query);
    }).sort((a, b) => {
      const aTags = a.Tags ? a.Tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
      const bTags = b.Tags ? b.Tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
      const query = searchQuery.toLowerCase();
      const aRelevance = aTags.reduce((acc, tag) => acc + (tag.includes(query) ? 1 : 0), 0);
      const bRelevance = bTags.reduce((acc, tag) => acc + (tag.includes(query) ? 1 : 0), 0);
      return bRelevance - aRelevance;
    });

    setSearchResults(results);
  };

  const handleNavigate = (id) => {
    navigate(`/view?id=${id}`, { state: { from: 'search' } });
  };

  const handleShowInGrid = (id) => {
    const highlightID = itemHighlightID[id];
    if (highlightID) {
      setHighlightItem(highlightID);
      navigate('/grid');
    } else {
      alert("Item not found in grid");
    }
  };

  return (
    <Box textAlign="center" mt={8}>
      <Heading>Search Inventory</Heading>
      <Box mt={4} display="flex" justifyContent="center">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by tags or ID"
          width="50%"
        />
        <Button onClick={handleSearch} ml={2}>Search</Button>
      </Box>
      {searchResults.length > 0 && (
        <SimpleGrid columns={1} spacing={4} mt={8}>
          {searchResults.map((item, index) => (
            <Flex key={index} border="1px solid gray" padding={4} borderRadius="md" alignItems="center">
              {item.ImageURL ? (
                <Image src={item.ImageURL} alt={item.Item} height="200px" objectFit="cover" mr={4} />
              ) : (
                <Box height="200px" width="200px" display="flex" alignItems="center" justifyContent="center" border="1px solid gray" mr={4}>
                  No Image
                </Box>
              )}
              <VStack align="start" spacing={3} flex="1">
                <Flex width="100%">
                  <VStack align="start" flex="1" spacing={1}>
                    <Text>ID: <Button variant="link" onClick={() => handleNavigate(item.ID)}>{item.ID}</Button></Text>
                    <Text>Item: {item.Item}</Text>
                    <Text>Description: {item.Description || "No Description"}</Text>
                    <Button
                      colorScheme="teal"
                      onClick={() => handleShowInGrid(item.ID)}
                      isDisabled={!itemExistsInGrid[item.ID]}
                    >
                      Show in Grid
                    </Button>
                  </VStack>
                  <VStack align="start" flex="1" spacing={1}>
                    <Text>Campus: {item.Campus}</Text>
                    <Text>Room: {item.Room}</Text>
                    <Text>Shelf Container: <Button variant="link" onClick={() => handleNavigate(item.ShelfContainer)}>{item.ShelfContainer}</Button></Text>
                  </VStack>
                </Flex>
              </VStack>
            </Flex>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
