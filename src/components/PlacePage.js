import React, { useState, useEffect } from 'react';
import { Box, Button, Input, Select, Text, Heading } from '@chakra-ui/react';

export default function PlacePage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [itemId, setItemId] = useState('');
  const [adjacentItem, setAdjacentItem] = useState('');
  const [orientation, setOrientation] = useState('');
  const [gridData, setGridData] = useState(null);
  const [adjacentPosition, setAdjacentPosition] = useState('');

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

      const itemPosition = findItemPosition(data, adjacentItem);
      if (itemPosition) {
        const grid = generateGridWithFetchedData(data, itemPosition);
        setGridData(grid);
        console.log('Fetched latest grid data:', grid);
        return itemPosition; // Return the position of the adjacent item
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

    try {
      const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv/search?Room=${roomName}&sheet=Legend`);
      const data = await response.json();
      setOrientation(data[0]?.Orientation || '');  // Set the room orientation
    } catch (error) {
      console.error('Error fetching room orientation:', error);
    }
  };

  const handleCheckAdjacentItem = async () => {
    if (!selectedRoom || !adjacentItem) return;

    console.log(`Checking item: ${adjacentItem} in room: ${selectedRoom}`);
    await fetchLatestGridData(); // Refetch the grid data when checking
  };

  const findItemPosition = (data, item) => {
    console.log('Finding item position...');
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      for (let col in row) {
        if (row[col] === item) {
          console.log(`Item found at row: ${rowIndex + 1}, col: ${col}`);
          return { row: rowIndex + 1, col };  // Return the correct row and column
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

  const handleSelectPosition = (position) => {
    if (!gridData || !itemId) return;

    console.log(`Placing item: ${itemId} at position: ${position}`);

    const newGrid = gridData.map(row => row.map(cell => ({ ...cell }))); // Clone the existing grid

    // Clear the previous placement of itemId
    for (let rowIndex = 0; rowIndex < newGrid.length; rowIndex++) {
      for (let colIndex = 0; colIndex < newGrid[rowIndex].length; colIndex++) {
        if (newGrid[rowIndex][colIndex].value === itemId) {
          newGrid[rowIndex][colIndex] = gridData[rowIndex][colIndex]; // Restore original value
        }
      }
    }

    // Determine the position to place the item
    let targetRow = 1;
    let targetCol = 1;
    switch (position) {
      case 'Left':
        targetCol = 0;
        break;
      case 'Right':
        targetCol = 2;
        break;
      case 'In Front':
        targetRow = 0;
        break;
      case 'Behind':
        targetRow = 2;
        break;
      default:
        console.error('Invalid position selected');
        return;
    }

    // Check if the target position is occupied
    if (newGrid[targetRow][targetCol].value) {
      newGrid[targetRow][targetCol] = { value: itemId, color: 'red' }; // Place item and mark as conflict
    } else {
      newGrid[targetRow][targetCol] = { value: itemId, color: 'yellow' }; // Place item and mark as valid
    }

    setGridData(newGrid); // Update the gridData state to reflect the new item placement
    console.log('Updated grid:', newGrid);
  };

  const handleSubmit = async () => {
    if (!selectedRoom || !itemId || !adjacentPosition) return;

    console.log('Refetching grid data before submitting...');
    const itemPosition = await fetchLatestGridData(); // Get the position of the adjacent item
    if (!itemPosition) return; // Abort if fetching fails

    const scriptUrl = 'https://script.google.com/macros/s/AKfycby6zN4sKDKQMwptcMXAjBeJo4VZLg7IGSBi2R0g0-gtlrjDQXw1OQZYxHUnbSLDMUyAIQ/exec'; // Replace with your script URL

    let { newRow, newCol } = determineNewPosition(itemPosition, adjacentPosition); // Use the position of the adjacent item for determining the new position

    if (newRow === null || newCol === null) {
      alert('Error determining new position.');
      return;
    }

    // Check if the position is out of bounds and trigger row/column addition if needed
    const isRowOutOfBounds = newRow > itemPosition.row + 1;
    const isColOutOfBounds = newCol > itemPosition.col.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

    if (isRowOutOfBounds || isColOutOfBounds) {
      console.log('Position is out of bounds. Adding necessary row/column.');
      const params = new URLSearchParams({
        action: 'addRowOrColumn',
        roomName: selectedRoom,
        row: isRowOutOfBounds ? newRow + 1 : itemPosition.row,
        col: isColOutOfBounds ? convertToColumnLabel(newCol) : convertToColumnLabel(itemPosition.col.charCodeAt(0) - 'A'.charCodeAt(0))
      });

      try {
        const response = await fetch(`${scriptUrl}?${params}`, {
          method: 'POST',
        });

        const result = await response.text();
        console.log('Ensured grid space:', result);

      } catch (error) {
        console.error('Error ensuring grid space:', error);
        alert('Error ensuring grid space.');
        return;
      }
    }

    // Proceed to place the item
    const placeItemParams = new URLSearchParams({
      action: 'placeItem',
      roomName: selectedRoom,
      row: newRow,
      col: convertToColumnLabel(newCol),
      itemId: itemId
    });

    try {
      const placeResponse = await fetch(`${scriptUrl}?${placeItemParams}`, {
        method: 'POST',
      });

      const placeResult = await placeResponse.text();
      console.log('Item placed:', placeResult);
      alert(`Item ${itemId} placed ${adjacentPosition} of ${adjacentItem} in room ${selectedRoom}`);

      // Reload the page after a successful submission
      window.location.reload();

    } catch (error) {
      console.error('Error placing item:', error);
      alert('Error placing item.');
    }
  };

  const determineNewPosition = (itemPosition, position) => {
    let newRow = itemPosition.row;
    let newCol = itemPosition.col.charCodeAt(0) - 'A'.charCodeAt(0);

    switch (position) {
      case 'Left':
        newCol -= 1;
        break;
      case 'Right':
        newCol += 1;
        break;
      case 'In Front':
        newRow -= 1;
        break;
      case 'Behind':
        newRow += 1;
        break;
      default:
        console.error("Invalid position: " + position);
        return { newRow: null, newCol: null };
    }
    newRow += 1;

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

      {orientation && (
        <Text mt={4}>
          Orientation: {orientation}
        </Text>
      )}

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
                >
                  {cell.value || ' '}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}

      {gridData && (
        <>
          <Text mt={4}>How is the pallet/item adjacent to your Item</Text>
          <Select
            placeholder="Choose Position"
            value={adjacentPosition}
            onChange={(e) => {
              setAdjacentPosition(e.target.value);
              handleSelectPosition(e.target.value); // Call the function to update the grid
            }}
            mt={2}
          >
            <option value="Left">Left</option>
            <option value="Right">Right</option>
            <option value="In Front">In Front</option>
            <option value="Behind">Behind</option>
          </Select>

          <Button onClick={handleSubmit} colorScheme="teal" mt={4}>Submit</Button>
        </>
      )}
    </Box>
  );
}
