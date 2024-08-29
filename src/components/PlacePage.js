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

    try {
      const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=${selectedRoom}`);
      const data = await response.json();

      const itemPosition = findItemPosition(data, adjacentItem);
      
      if (itemPosition) {
        // Generate the 3x3 grid with adjacentItem in the middle
        const grid = generateGrid(data, itemPosition);
        setGridData(grid);
      } else {
        setGridData(null);
        alert('Adjacent item not found in the room.');
      }
    } catch (error) {
      console.error('Error checking adjacent item:', error);
    }
  };

  const findItemPosition = (data, item) => {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      for (let col in row) {
        if (row[col] === item) {
          return { row: rowIndex + 1, col };
        }
      }
    }
    return null;
  };

  const generateGrid = (data, { row, col }) => {
    const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0);
    const grid = Array(3).fill(null).map(() => Array(3).fill(''));

    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const currentRow = row + r;
        const currentCol = String.fromCharCode('A'.charCodeAt(0) + colIndex + c);
        const cellValue = data[currentRow - 1]?.[currentCol] || '';
        grid[r + 1][c + 1] = cellValue;
      }
    }

    return grid;
  };

  const determineNewPosition = (grid, position) => {
    // Determine the current item position (center of the grid)
    const currentRow = 1;  // Middle row in a 3x3 grid
    const currentCol = 1;  // Middle column in a 3x3 grid

    let newRow = currentRow;
    let newCol = currentCol;

    switch (position) {
        case 'Left':
            newCol = currentCol - 1;
            break;
        case 'Right':
            newCol = currentCol + 1;
            break;
        case 'In Front':
            newRow = currentRow - 1;
            break;
        case 'Behind':
            newRow = currentRow + 1;
            break;
        default:
            console.error("Invalid position: " + position);
            return null;
    }

    // Ensure the new position is within the grid bounds
    if (newRow < 0 || newRow > 2 || newCol < 0 || newCol > 2) {
        console.error("Calculated new position is out of bounds: Row " + newRow + ", Col " + newCol);
        return null;
    }

    return { newRow, newCol };
};




const ensureGridSpace = async (room, row, col) => {
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbyOMzv1DnacgF6Mdl4_EXQqAc_SNmBStVLsn0dwVK47Nsmw4QI3e-rNDod6QEEFU_fQqA/exec';

    const params = new URLSearchParams({
        action: 'addRowOrColumn',
        roomName: room,
        row: row.toString(),
        col: col
    });

    try {
        const response = await fetch(`${scriptUrl}?${params}`, {
            method: 'POST',
        });

        const result = await response.text();
        console.log(result);
    } catch (error) {
        console.error('Error ensuring grid space:', error);
    }
};

const convertToColumnLabel = (colIndex) => {
  let columnLabel = '';
  while (colIndex >= 0) {
      columnLabel = String.fromCharCode((colIndex % 26) + 65) + columnLabel;
      colIndex = Math.floor(colIndex / 26) - 1;
  }
  return columnLabel;
};

const handleSubmit = async () => {
  if (!selectedRoom || !itemId || !adjacentPosition || !gridData) return;

  const positionResult = determineNewPosition(gridData, adjacentPosition);

  if (!positionResult) {
      alert('Error determining new position.');
      return;
  }

  let { newRow, newCol } = positionResult;

  console.log("Selected Room:", selectedRoom);
  console.log("Item ID:", itemId);
  console.log("New Row:", newRow);
  console.log("New Column (Numeric):", newCol);

  // Convert the numeric column index to a column letter (e.g., 0 -> A, 1 -> B)
  const newColLabel = convertToColumnLabel(newCol);
  console.log("New Column (Alphabetical):", newColLabel);

  // Ensure the grid space exists
  await ensureGridSpace(selectedRoom, newRow + 1, newColLabel);

  // Prepare the data to send, using only the column and row for the item
  const dataToSend = {
      [newColLabel]: itemId  // This ensures only column C is updated, for example
  };
  console.log("Data being sent:", JSON.stringify(dataToSend));

  try {
      // Fetch the current room sheet data
      const fetchData = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=${selectedRoom}`);
      const roomData = await fetchData.json();
      console.log('Room Data:', roomData);

      // Determine if the row already exists, and if so, update the existing row
      const existingRow = roomData.find(row => row.A === (newRow + 1).toString());

      if (existingRow) {
          // If the row exists, PATCH the existing row with the new column data
          const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv/ID/${existingRow.ID}?sheet=${selectedRoom}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dataToSend),
          });
          const result = await response.json();
          console.log('Item placed:', result);

          if (result.error) {
              console.error('Error placing item:', result.error);
              alert(`Error placing item: ${result.error}`);
          } else {
              alert(`Item ${itemId} placed ${adjacentPosition} of ${adjacentItem} in room ${selectedRoom}`);
          }
      } else {
          // If the row does not exist, insert the item directly
          const newItemData = {
            A: (newRow + 1).toString(),  // Only add the row number where needed
            [newColLabel]: itemId        // Ensure this is the only data being added to column C
        };
        
          const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=${selectedRoom}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newItemData),
          });
          const result = await response.json();
          console.log('Item placed:', result);

          if (result.error) {
              console.error('Error placing item:', result.error);
              alert(`Error placing item: ${result.error}`);
          } else {
              alert(`Item ${itemId} placed ${adjacentPosition} of ${adjacentItem} in room ${selectedRoom}`);
          }
      }
  } catch (error) {
      console.error('Error placing item:', error);
  }
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
                <Box key={cellIndex} border="1px solid black" p={4} minWidth="50px">
                  {cell || ' '}
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
            onChange={(e) => setAdjacentPosition(e.target.value)}
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
