import React, { useState, useEffect } from 'react';
import { Box, Button, Input, Heading, Select, Text } from '@chakra-ui/react';

const API_KEY = 'AIzaSyB0wrN1VBWSFO7eVfUC3w2QfcNciqRBJfg';
const SPREADSHEET_ID = '1W2fpkdeXfpzSqLZLHSBGT2-hTbfqqAgnCXR2k90clks';

export default function PlacePage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [itemId, setItemId] = useState('');
  const [orientation, setOrientation] = useState('');
  const [adjacentItem, setAdjacentItem] = useState('');
  const [grid, setGrid] = useState([]);
  const [placementOption, setPlacementOption] = useState('');
  const [gridLoaded, setGridLoaded] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Legend!A2:B?key=${API_KEY}`);
      const data = await response.json();
      const filteredRooms = data.values.filter(row => row[1] === 'TRUE').map(row => row[0]);
      setRooms(filteredRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchOrientation = async (room) => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Legend!A:C?key=${API_KEY}`);
      const data = await response.json();
      const roomData = data.values.find(row => row[0] === room);
      setOrientation(roomData ? roomData[2] : 'No orientation found');
    } catch (error) {
      console.error("Error fetching orientation:", error);
    }
  };

  const handleRoomChange = (e) => {
    const room = e.target.value;
    setSelectedRoom(room);
    fetchOrientation(room);
  };

  const handleCheckAdjacentItem = async () => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${selectedRoom}!A1:Z1000?key=${API_KEY}`);
      const data = await response.json();
      const rows = data.values || [];
      const itemFound = rows.some(row => row.includes(adjacentItem));
      
      if (itemFound) {
        generate3x3Grid(rows);
      } else {
        alert("Item not found in the room's grid.");
        setGrid([]);
        setGridLoaded(false);
      }
    } catch (error) {
      console.error(`Error checking item in room ${selectedRoom}:`, error);
    }
  };

  const generate3x3Grid = (rows) => {
    // Logic to generate 3x3 grid around the adjacentItem
    // Identify position and populate grid accordingly
    setGridLoaded(true);
    // Example grid generation:
    setGrid([
      ['Item1', 'Item2', 'Item3'],
      ['Item4', 'AdjacentItem', 'Item6'],
      ['Item7', 'Item8', 'Item9'],
    ]);
  };

  const handleSubmit = async () => {
    if (!placementOption || !itemId || !selectedRoom) return;

    const cellPosition = determineCellPosition(placementOption);
    if (!cellPosition) {
      alert("Invalid placement option.");
      return;
    }

    try {
      const updateRange = `${selectedRoom}!${cellPosition}`;
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${updateRange}?valueInputOption=RAW&key=${API_KEY}`, 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: updateRange,
            majorDimension: 'ROWS',
            values: [[itemId]],
          }),
        }
      );
      
      const result = await response.json();
      console.log("Update result:", result);
      alert("Item placed successfully!");
    } catch (error) {
      console.error("Error updating item placement:", error);
    }
  };

  const determineCellPosition = (placementOption) => {
    // Logic to determine the A1 notation of the cell based on the placementOption
    // Example: return 'C3' if the position is to be placed in cell C3
    switch (placementOption) {
      case 'left':
        return 'B2'; // Example
      case 'right':
        return 'D2'; // Example
      case 'front':
        return 'C1'; // Example
      case 'back':
        return 'C3'; // Example
      default:
        return null;
    }
  };

  return (
    <Box textAlign="center" mt={8}>
      <Heading>Place Page</Heading>

      <Box mt={4}>
        <Text mb={2}>Choose Room</Text>
        <Select placeholder="Select room" value={selectedRoom} onChange={handleRoomChange}>
          {rooms.map((room, index) => (
            <option key={index} value={room}>
              {room}
            </option>
          ))}
        </Select>
      </Box>

      <Box mt={4}>
        <Text mb={2}>Item ID</Text>
        <Input placeholder="Enter Item ID" value={itemId} onChange={(e) => setItemId(e.target.value)} />
      </Box>

      {orientation && (
        <Box mt={4}>
          <Text>{orientation}</Text>
          <Text mt={4}>Facing the correct Orientation, enter a pallet/Item adjacent to this item</Text>
          <Input
            placeholder="Enter adjacent item ID"
            value={adjacentItem}
            onChange={(e) => setAdjacentItem(e.target.value)}
          />
          <Button mt={2} onClick={handleCheckAdjacentItem}>Check</Button>
        </Box>
      )}

      {gridLoaded && (
        <Box mt={4}>
          <Text>How is the pallet/item adjacent to your Item</Text>
          <Select
            placeholder="Select placement"
            value={placementOption}
            onChange={(e) => setPlacementOption(e.target.value)}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="front">In Front</option>
            <option value="back">Behind</option>
          </Select>
        </Box>
      )}

      {gridLoaded && (
        <Box mt={4}>
          <Text>3x3 Grid Preview:</Text>
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <Box key={`${rowIndex}-${colIndex}`} p={4} border="1px solid #ccc" bg={cell ? 'teal.100' : 'gray.100'}>
                  {cell || '-'}
                </Box>
              ))
            )}
          </Box>
          <Button mt={4} colorScheme="teal" onClick={handleSubmit}>
            Submit
          </Button>
        </Box>
      )}
    </Box>
  );
}
