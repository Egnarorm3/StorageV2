import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Input, Heading, VStack, Flex, Text, Image } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { GridHighlightContext } from '../App';

export default function GridMap({ items, onAssignItem, onSubmit }) {
  const [gridData, setGridData] = useState({ room1: [], room2: [], room3: [] });
  const [currentRoom, setCurrentRoom] = useState('room1');
  const [searchQuery, setSearchQuery] = useState('');
  const [smartSearchMode, setSmartSearchMode] = useState(false);
  const [smartSearchResults, setSmartSearchResults] = useState([]);
  const [popupResults, setPopupResults] = useState(null);
  const [zoom, setZoom] = useState(1); // Added state for zoom level
  const { highlightItem } = useContext(GridHighlightContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGridData();
  }, []);

  useEffect(() => {
    if (highlightItem) {
      setSearchQuery(highlightItem);
    }
  }, [highlightItem]);

  const fetchGridData = async () => {
    try {
      const response1 = await fetch('https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room1');
      const data1 = await response1.json();

      const response2 = await fetch('https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room2');
      const data2 = await response2.json();

      const response3 = await fetch('https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room3');
      const data3 = await response3.json();

      // Cut off everything under row 25 in room1
      const filteredData1 = data1.slice(0, 24);

      setGridData({ room1: filteredData1, room2: data2, room3: data3 });
    } catch (error) {
      console.error('Error fetching grid data:', error);
    }
  };

  const handleCellClick = (value) => {
    if (smartSearchMode) {
      const results = smartSearchResults.filter(result => 
        result.ID === value || result.ShelfContainer === value
      );
      setPopupResults(results);
    } else {
      setSearchQuery(value);
    }
  };

  const renderGrid = (data) => {
    return data.map((row, rowIndex) => (
      <Flex key={rowIndex} wrap="nowrap">
        {Object.entries(row).map(([key, value]) => (
          <Box
            key={key}
            className="grid-cell"
            onClick={() => handleCellClick(value)}
            bg={
              smartSearchMode 
                ? (smartSearchResults.some(result => (result.ID === value || result.ShelfContainer === value) && value.trim() !== '') ? 'yellow' : 'white')
                : (value.toLowerCase().includes(searchQuery.toLowerCase()) && value.trim() !== '' ? 'yellow' : 'white')
            }
            p={2}
            border="1px solid #ccc"
            borderRadius="md"
            textAlign="center"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            width={`${100 * zoom}px`}
            height={`${100 * zoom}px`} // Ensure cells are squares
          >
            {value}
          </Box>
        ))}
      </Flex>
    ));
  };

  const handleSmartSearch = async () => {
    const filteredInventory = items.filter(item => {
      return item.Status !== 'FALSE' && item.Status !== 'Old' && item.Status !== 'Prodigy';
    });

    const prioritizedInventory = filteredInventory.sort((a, b) => {
      const statusA = a.Status ? a.Status.toUpperCase() : '';
      const statusB = b.Status ? a.Status.toUpperCase() : '';

      if (statusA === 'TRUE' && (statusB === '' || statusB === ' ')) return -1;
      if ((statusA === '' || statusA === ' ') && statusB === 'TRUE') return 1;
      return 0;
    });

    const results = prioritizedInventory.filter(item => {
      const tags = item.Tags ? item.Tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
      const query = searchQuery.toLowerCase();
      return tags.some(tag => tag.includes(query)) || item.ID.toLowerCase().includes(query);
    });

    setSmartSearchResults(results);
  };

  const roomResults = (room) => {
    if (smartSearchMode) {
      return gridData[room].reduce(
        (acc, row) =>
          acc +
          Object.values(row).reduce(
            (cellAcc, cell) =>
              smartSearchResults.some(result => (result.ID === cell || result.ShelfContainer === cell) && cell.trim() !== '')
                ? cellAcc + 1
                : cellAcc,
            0
          ),
        0
      );
    } else {
      return gridData[room].reduce(
        (acc, row) =>
          acc +
          Object.values(row).reduce(
            (cellAcc, cell) =>
              cell.toLowerCase().includes(searchQuery.toLowerCase()) && cell.trim() !== ''
                ? cellAcc + 1
                : cellAcc,
            0
          ),
        0
      );
    }
  };

  const handleNavigate = (id) => {
    navigate(`/view?id=${id}`, { state: { from: 'search' } });
  };

  const handleZoomIn = () => {
    setZoom(prevZoom => prevZoom + 0.1);
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => (prevZoom > 0.2 ? prevZoom - 0.1 : prevZoom));
  };

  return (
    <Box textAlign="center">
      <Heading>Grid Map</Heading>
      <Box mb={4}>
        <Button
          colorScheme={currentRoom === 'room1' ? 'teal' : 'gray'}
          onClick={() => setCurrentRoom('room1')}
          mr={2}
        >
          Room 1 ({roomResults('room1')} results)
        </Button>
        <Button
          colorScheme={currentRoom === 'room2' ? 'teal' : 'gray'}
          onClick={() => setCurrentRoom('room2')}
          mr={2}
        >
          Room 2 ({roomResults('room2')} results)
        </Button>
        <Button
          colorScheme={currentRoom === 'room3' ? 'teal' : 'gray'}
          onClick={() => setCurrentRoom('room3')}
        >
          Room 3 ({roomResults('room3')} results)
        </Button>
      </Box>
      <Box mb={4}>
        <Button onClick={() => setSmartSearchMode(!smartSearchMode)} mb={2}>
          {smartSearchMode ? 'Switch to Normal Search' : 'Switch to Smart Search'}
        </Button>
        {smartSearchMode ? (
          <Box>
            <Input
              placeholder="Smart Search in grid"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={handleSmartSearch} ml={2}>Search</Button>
          </Box>
        ) : (
          <Input
            placeholder="Search in grid"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        )}
      </Box>
      <Box mb={4}>
        <Button onClick={handleZoomIn} mr={2}>Zoom In</Button>
        <Button onClick={handleZoomOut}>Zoom Out</Button>
      </Box>
      <Box overflowX="auto" width="100%">
        <VStack>
          {currentRoom === 'room1' && renderGrid(gridData.room1)}
          {currentRoom === 'room2' && renderGrid(gridData.room2)}
          {currentRoom === 'room3' && renderGrid(gridData.room3)}
        </VStack>
      </Box>
      {popupResults && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100vw"
          height="100vh"
          bg="rgba(0, 0, 0, 0.5)"
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex="1000"
          p={4}
          overflowY="auto"
        >
          <Box
            bg="white"
            p={4}
            border="1px solid #ccc"
            borderRadius="md"
            maxHeight="80vh"
            overflowY="auto"
            width="80%"
          >
            <Heading size="md">Search Results</Heading>
            <VStack mt={4}>
              {popupResults.map((result, index) => (
                <Flex key={index} p={2} w="100%" justify="space-between" alignItems="center" border="1px solid #ccc" borderRadius="md">
                  {result.ImageURL ? (
                    <Image src={result.ImageURL} alt={result.Item} height="50px" mr={4} />
                  ) : (
                    <Box height="50px" width="50px" display="flex" alignItems="center" justifyContent="center" border="1px solid gray" mr={4}>
                      No Image
                    </Box>
                  )}
                  <Text>{result.Item}</Text>
                  <Text>{result.Description}</Text>
                  <Button onClick={() => handleNavigate(result.ID)}>View</Button>
                </Flex>
              ))}
            </VStack>
            <Button onClick={() => setPopupResults(null)} mt={4}>Close</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
