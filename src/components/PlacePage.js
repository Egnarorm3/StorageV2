import React, { useState, useEffect } from 'react';
import { Box, Button, Input, Select, Text, Heading } from '@chakra-ui/react';

export default function PlacePage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [itemId, setItemId] = useState('');
  const [adjacentItem, setAdjacentItem] = useState('');
  const [gridData, setGridData] = useState(null);
  const [previousPosition, setPreviousPosition] = useState(null); 
  const [previousState, setPreviousState] = useState(null); 

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Legend');
      const data = await response.json();
      const filteredRooms = data.filter(room => room.Map === 'TRUE');
      setRooms(filteredRooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchLatestGridData = async () => {
    if (!selectedRoom) return;

    try {
      const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=${selectedRoom}`);
      const data = await response.json();

      const itemPosition = findItemPosition(data, adjacentItem.toLowerCase());
      if (itemPosition) {
        const grid = generateGridWithFetchedData(data, itemPosition);
        setGridData(grid);
        console.log('Fetched latest grid data:', grid);
        return itemPosition; 
      } else {
        setGridData(null);
        alert('Adjacent item not found in the room.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching latest grid data:', error);
      return null;
    }
  };

  const handleRoomChange = async (e) => {
    const roomName = e.target.value;
    setSelectedRoom(roomName);
  };

  const handleCheckAdjacentItem = async () => {
    if (!selectedRoom || !adjacentItem) return;
    await fetchLatestGridData(); 
  };

  const findItemPosition = (data, item) => {
    console.log('Finding item position...');
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      for (let col in row) {
        if (row[col].toLowerCase() === item) { 
          console.log(`Item found at row: ${rowIndex + 1}, col: ${col}`);
          return { row: rowIndex + 1, col };  
        }
      }
    }
    console.log('Item not found.');
    return null;
  };

  const generateGridWithFetchedData = (data, { row, col }) => {
    const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0);
    const grid = Array(3).fill(null).map(() => Array(3).fill({ value: '', color: '' }));

    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const currentRow = row + r;
        const currentCol = String.fromCharCode('A'.charCodeAt(0) + colIndex + c);
        const cellValue = data[currentRow - 1]?.[currentCol] || '';
        grid[r + 1][c + 1] = { value: cellValue, color: '' };
      }
    }

    grid[1][1] = { value: adjacentItem, color: '' }; // Place the adjacent item in the center

    return grid;
  };

  const handleGridClick = (rowIndex, colIndex) => {
    if (!gridData || !itemId) return;

    console.log(`Placing item: ${itemId} at grid position: [${rowIndex}, ${colIndex}]`);

    // Clone the gridData to reset any previous placements or conflicts
    const newGrid = gridData.map(row => row.map(cell => ({ ...cell })));

    // If there was a previous position, revert it to its original state
    if (previousPosition && previousState) {
      const { prevRow, prevCol } = previousPosition;
      newGrid[prevRow][prevCol] = previousState; // Restore the original state
    }

    // Save the current state before modifying
    const currentState = { ...newGrid[rowIndex][colIndex] };
    setPreviousState(currentState);
    setPreviousPosition({ prevRow: rowIndex, prevCol: colIndex });

    // Check if the target position is occupied
    if (newGrid[rowIndex][colIndex].value) {
      newGrid[rowIndex][colIndex] = {
        value: newGrid[rowIndex][colIndex].value,
        color: 'red',  // Mark as conflict if occupied
      };
    } else {
      newGrid[rowIndex][colIndex] = {
        value: itemId,
        color: 'yellow',  // Mark as valid placement if not occupied
      };
    }

    setGridData(newGrid); // Update the gridData state to reflect the new item placement
    console.log('Updated grid:', newGrid);
  };

  const handleSubmit = async () => {
    if (!selectedRoom || !itemId || !previousPosition) return;
  
    const itemPosition = await fetchLatestGridData();
    if (!itemPosition) return;
  
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxxEbEU-JayjfuoKr8ncCCnVhwL6xZpu2FoF3GEqtHZs4xG7URovTVo6zEzEHEGdbaI0g/exec';
  
    let { newRow, newCol } = determineNewPosition(itemPosition, previousPosition);
  
    // If newCol is -1, we know it's supposed to be the first column, which will be 'A'
    if (newCol === -1) {
      newCol = 'A';
    } else {
      newCol = convertToColumnLabel(newCol); // Convert column index to letter
    }
  
    const placeItemParams = new URLSearchParams({
      action: 'placeItem',
      roomName: selectedRoom,
      row: newRow,
      col: newCol,
      itemId: itemId
    });
  
    try {
      const placeResponse = await fetch(`${scriptUrl}?${placeItemParams}`, {
        method: 'POST',
      });
  
      const placeResult = await placeResponse.text();
      console.log('Item placed:', placeResult);
      alert(`Item ${itemId} placed successfully in room ${selectedRoom}`);
  
      window.location.reload();
    } catch (error) {
      console.error('Error placing item:', error);
      alert('Error placing item.');
    }
  };
  

  const determineNewPosition = (itemPosition, clickedPosition) => {
    let newRow = itemPosition.row;
    let newCol = itemPosition.col.charCodeAt(0) - 'A'.charCodeAt(0);

    const rowOffset = clickedPosition.prevRow - 1;
    const colOffset = clickedPosition.prevCol - 1;

    newRow += rowOffset;
    newCol += colOffset;
    newRow += 1;
    if (newCol < 0) {
      newCol = -1; 
    }

    return { newRow, newCol };
  };

  const convertToColumnLabel = (colIndex) => {
    let columnLabel = '';
    while (colIndex >= 0) {
      columnLabel = String.fromCharCode((colIndex % 26) + 65) + columnLabel;
      colIndex = Math.floor(colIndex / 26) - 1;
    }
    return columnLabel;
  };

  return (
    <Box textAlign="center" p={4}>
      <Heading mb={4}>Place Page</Heading>

      <Select placeholder="Choose Room" value={selectedRoom} onChange={handleRoomChange}>
        {rooms.map((room, index) => (
          <option key={index} value={room.Room}>{room.Room}</option>
        ))}
      </Select>

      <Input
        placeholder="Item ID"
        value={itemId}
        onChange={(e) => setItemId(e.target.value)}
        mt={4}
      />

      <Text mt={4}>
        Facing the correct Orientation, enter a pallet/Item adjacent to this item
      </Text>
      <Input
        placeholder="Adjacent Item"
        value={adjacentItem}
        onChange={(e) => setAdjacentItem(e.target.value)}
        mt={2}
      />
      <Button onClick={handleCheckAdjacentItem} mt={2}>Check</Button>

      {gridData && (
        <Box mt={4}>
          {gridData.map((row, rowIndex) => (
            <Box key={rowIndex} display="flex" justifyContent="center">
              {row.map((cell, cellIndex) => (
                <Box 
                  key={cellIndex} 
                  border="1px solid black" 
                  minWidth="50px" 
                  width="50px" 
                  height="50px" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  backgroundColor={cell.color || 'transparent'}
                  onClick={() => handleGridClick(rowIndex, cellIndex)} // Handle grid cell click
                >
                  {cell.value || ' '}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}

      <Button onClick={handleSubmit} colorScheme="teal" mt={4}>Submit</Button>
    </Box>
  );
}
