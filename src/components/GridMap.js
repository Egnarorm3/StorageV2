import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Input, Heading } from '@chakra-ui/react';
import { GridHighlightContext } from '../App';

export default function GridMap({ items, onAssignItem, onSubmit }) {
  const { highlightItem, setHighlightItem } = useContext(GridHighlightContext);
  const [gridData, setGridData] = useState({ room1: [], room2: [], room3: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [newCellValue, setNewCellValue] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (highlightItem) {
      setSearchTerm(highlightItem);
    }
  }, [highlightItem]);

  const fetchData = async () => {
    try {
      const response1 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room1");
      const data1 = await response1.json();

      const response2 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room2");
      const data2 = await response2.json();

      const response3 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room3");
      const data3 = await response3.json();

      setGridData({ room1: data1, room2: data2, room3: data3 });
    } catch (error) {
      console.error("Error fetching grid data:", error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCellClick = (rowIndex, colIndex, roomKey) => {
    setEditingCell({ rowIndex, colIndex, roomKey });
    setNewCellValue(gridData[roomKey][rowIndex][colIndex]);
  };

  const handleCellChange = (e) => {
    setNewCellValue(e.target.value);
  };

  const handleCellSubmit = async () => {
    if (editingCell) {
      const { rowIndex, colIndex, roomKey } = editingCell;
      const updatedGridData = { ...gridData };
      updatedGridData[roomKey][rowIndex][colIndex] = newCellValue;

      setGridData(updatedGridData);
      setEditingCell(null);

      // Submit the updated value to Google Sheets
      try {
        await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv/${rowIndex + 1}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [colIndex]: newCellValue }),
        });
      } catch (error) {
        console.error("Error updating cell value:", error);
      }
    }
  };

  const renderGrid = (roomData, roomKey) => {
    return (
      <Box>
        {roomData.map((row, rowIndex) => (
          <Box key={rowIndex} display="flex">
            {Object.keys(row).map((col, colIndex) => (
              <Box
                key={colIndex}
                width="40px"
                height="40px"
                border="1px solid #ccc"
                display="flex"
                alignItems="center"
                justifyContent="center"
                backgroundColor={
                  searchTerm &&
                  row[col] &&
                  row[col].toLowerCase().includes(searchTerm.toLowerCase())
                    ? 'yellow'
                    : 'white'
                }
                onClick={() => handleCellClick(rowIndex, colIndex, roomKey)}
                style={{ overflow: 'hidden', wordWrap: 'break-word', textAlign: 'center' }}
              >
                {editingCell &&
                editingCell.rowIndex === rowIndex &&
                editingCell.colIndex === colIndex &&
                editingCell.roomKey === roomKey ? (
                  <Input
                    value={newCellValue}
                    onChange={handleCellChange}
                    onBlur={handleCellSubmit}
                    autoFocus
                  />
                ) : (
                  row[col]
                )}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Heading>Grid Map</Heading>
        <Input
          placeholder="Search in grid"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </Box>
      <Box>
        <Heading size="md">Room 1</Heading>
        {renderGrid(gridData.room1, 'room1')}
      </Box>
      <Box mt={8}>
        <Heading size="md">Room 2</Heading>
        {renderGrid(gridData.room2, 'room2')}
      </Box>
      <Box mt={8}>
        <Heading size="md">Room 3</Heading>
        {renderGrid(gridData.room3, 'room3')}
      </Box>
    </Box>
  );
}
