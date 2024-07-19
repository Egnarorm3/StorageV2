import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Input, Heading, VStack, Flex } from '@chakra-ui/react';
import { GridHighlightContext } from '../App';

export default function GridMap({ items, onAssignItem, onSubmit }) {
  const [gridData, setGridData] = useState({ room1: [], room2: [], room3: [] });
  const [currentRoom, setCurrentRoom] = useState('room1');
  const [searchQuery, setSearchQuery] = useState('');
  const { highlightItem } = useContext(GridHighlightContext);

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

      setGridData({ room1: data1, room2: data2, room3: data3 });
    } catch (error) {
      console.error('Error fetching grid data:', error);
    }
  };

  const handleCellClick = (value) => {
    setSearchQuery(value);
  };

  const renderGrid = (data) => {
    return data.map((row, rowIndex) => (
      <Flex key={rowIndex}>
        {Object.entries(row).map(([key, value]) => (
          <Box
            key={key}
            className="grid-cell"
            onClick={() => handleCellClick(value)}
            bg={value.toLowerCase().includes(searchQuery.toLowerCase()) ? 'yellow' : 'white'}
            p={2}
            border="1px solid #ccc"
            textAlign="center"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            maxWidth="100px"
          >
            {value}
          </Box>
        ))}
      </Flex>
    ));
  };

  const roomResults = (room) => {
    return gridData[room].reduce(
      (acc, row) =>
        acc +
        Object.values(row).reduce(
          (cellAcc, cell) =>
            cell.toLowerCase().includes(searchQuery.toLowerCase())
              ? cellAcc + 1
              : cellAcc,
          0
        ),
      0
    );
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
        <Input
          placeholder="Search in grid"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>
      <VStack>
        {currentRoom === 'room1' && renderGrid(gridData.room1)}
        {currentRoom === 'room2' && renderGrid(gridData.room2)}
        {currentRoom === 'room3' && renderGrid(gridData.room3)}
      </VStack>
    </Box>
  );
}
