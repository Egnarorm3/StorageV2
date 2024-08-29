import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Button,
  Input,
  Heading,
  VStack,
  Flex,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Image,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { GridHighlightContext } from '../App';

export default function GridMap({ items, onAssignItem, onSubmit }) {
  const [gridData, setGridData] = useState({});
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [smartSearchMode, setSmartSearchMode] = useState(false);
  const [smartSearchResults, setSmartSearchResults] = useState([]);
  const [popupResults, setPopupResults] = useState(null);
  const [zoom, setZoom] = useState(1); // State for zoom level
  const { highlightItem } = useContext(GridHighlightContext);
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomOrientation, setNewRoomOrientation] = useState('');

  useEffect(() => {
    fetchRoomsFromLegend();
  }, []);

  useEffect(() => {
    if (highlightItem) {
      setSearchQuery(highlightItem);
    }
  }, [highlightItem]);

  const fetchRoomsFromLegend = async () => {
    try {
      const response = await fetch('https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Legend');
      const data = await response.json();

      const validRooms = data
        .filter(item => item.Map === 'TRUE')
        .map(item => item.Room);

      setRooms(validRooms);

      if (validRooms.length > 0) {
        setCurrentRoom(validRooms[0]);
        fetchGridData(validRooms[0]);
      }
    } catch (error) {
      console.error('Error fetching rooms from Legend:', error);
    }
  };

  const fetchGridData = async (room) => {
    try {
      const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=${room}`);
      const data = await response.json();
      console.log('Fetched grid data for room:', room, data); // Add this line for debugging
      setGridData(prevGridData => ({ ...prevGridData, [room]: data }));
    } catch (error) {
      console.error(`Error fetching grid data for ${room}:`, error);
    }
  };
  

  const handleRoomChange = (room) => {
    setCurrentRoom(room);
    if (!gridData[room]) {
      fetchGridData(room);
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
    if (!data || data.length === 0) {
      return <Text>No data available for this room.</Text>;
    }
  
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
      return gridData[room]?.reduce(
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
      return gridData[room]?.reduce(
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

  const addRoomToLegend = async (roomName, orientation) => {
    try {
      const data = {
        "Room": roomName,
        "Map": "TRUE",
        "Orientation": orientation
      };

      const response = await fetch('https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Legend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Room added to Legend:", result);
    } catch (error) {
      console.error("Error adding room to Legend:", error);
    }
  };

  const handleAddRoom = async () => {
    // Add the room to the Legend sheet
    await addRoomToLegend(newRoomName, newRoomOrientation);
  
    // Trigger Google Apps Script to create the sheet
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbysPx5EfhCtSN2vcxQ1YU0hNEyG38aya17HZB-RdsgRTGZp7tlsZc3p6kxjB3kAh_oufg/exec'; // Replace with your Google Apps Script URL
    const params = new URLSearchParams({
      action: 'createRoom',  // Specify the action
      roomName: newRoomName,
    });
  
    try {
      const response = await fetch(`${scriptUrl}?${params}`, {
        method: 'POST',
      });
  
      const result = await response.text();
      console.log(result);
  
      // Fetch the updated rooms list
      fetchRoomsFromLegend();
      onClose();
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };
  
  
  return (
    <Box textAlign="center">
      <Heading>Grid Map</Heading>
      <Box mb={4}>
        {rooms.map(room => (
          <Button
            key={room}
            colorScheme={currentRoom === room ? 'teal' : 'gray'}
            onClick={() => handleRoomChange(room)}
            mr={2}
          >
            {room} ({roomResults(room)} results)
          </Button>
        ))}
        <Button onClick={onOpen} ml={2}>+</Button>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create a New Room</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              placeholder="Room Name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              mb={4}
            />
            <Input
              placeholder="Orientation"
              value={newRoomOrientation}
              onChange={(e) => setNewRoomOrientation(e.target.value)}
              mb={2}
            />
            <Text fontSize="sm" color="gray.500">
              The direction that should be faced when following the map. For example: "Facing the loading area" or "Facing the main brown door next to the electrical panel"
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleAddRoom}>
              Add
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Box mb={4}>
        <Button onClick={handleZoomIn} mr={2}>Zoom In</Button>
        <Button onClick={handleZoomOut}>Zoom Out</Button>
      </Box>
      <Box overflowX="auto" width="100%">
        <VStack>
          {rooms.includes(currentRoom) && renderGrid(gridData[currentRoom] || [])}
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
