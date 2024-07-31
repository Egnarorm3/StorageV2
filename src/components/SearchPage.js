import React, { useState, useContext, useEffect } from 'react';
import { Box, Input, Button, Heading, SimpleGrid, Image, Text, Flex, VStack, Checkbox, HStack, Stack, Collapse } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { GridHighlightContext } from '../App';

const RESULTS_PER_PAGE = 20;

export default function SearchPage({ inventory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [itemExistsInGrid, setItemExistsInGrid] = useState({});
  const [itemHighlightID, setItemHighlightID] = useState({});
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedCampuses, setSelectedCampuses] = useState({ None: true });
  const [selectedRooms, setSelectedRooms] = useState({ None: true });
  const [currentPage, setCurrentPage] = useState(1);
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

  useEffect(() => {
    const uniqueItems = new Set();
    const uniqueCampuses = new Set(['None']);
    const uniqueRooms = new Set(['None']);

    inventory.forEach(item => {
      if (item.Status !== 'Prodigy') {
        if (item.Item) uniqueItems.add(item.Item);
        if (item.Campus) uniqueCampuses.add(item.Campus);
        if (item.Room) uniqueRooms.add(item.Room);
      }
    });

    const initialItems = {};
    const initialCampuses = {};
    const initialRooms = {};

    uniqueItems.forEach(item => initialItems[item] = true);
    uniqueCampuses.forEach(campus => initialCampuses[campus] = true);
    uniqueRooms.forEach(room => initialRooms[room] = true);

    setSelectedItems(initialItems);
    setSelectedCampuses(initialCampuses);
    setSelectedRooms(initialRooms);
  }, [inventory]);

  const handleSearch = () => {
    const filteredInventory = inventory.filter(item => {
      return item.Status !== 'FALSE' && item.Status !== 'Old' && item.Status !== 'Prodigy';
    });

    const prioritizedInventory = filteredInventory.sort((a, b) => {
      const statusA = a.Status ? a.Status.toUpperCase() : '';
      const statusB = b.Status ? b.Status.toUpperCase() : '';

      if (statusA === 'TRUE' && (statusB === '' || statusB === ' ')) return -1;
      if ((statusA === '' || statusA === ' ') && statusB === 'TRUE') return 1;
      return 0;
    });

    const results = prioritizedInventory.filter(item => {
      const tags = item.Tags ? item.Tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
      const query = searchQuery.toLowerCase();
      return tags.some(tag => tag.includes(query)) || item.ID.toLowerCase().includes(query);
    }).filter(item => {
      const itemMatches = selectedItems[item.Item];
      const campusMatches = selectedCampuses[item.Campus || 'None'];
      const roomMatches = selectedRooms[item.Room || 'None'];
      return itemMatches && campusMatches && roomMatches;
    }).sort((a, b) => {
      const aTags = a.Tags ? a.Tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
      const bTags = b.Tags ? b.Tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
      const query = searchQuery.toLowerCase();
      const aRelevance = aTags.reduce((acc, tag) => acc + (tag.includes(query) ? 1 : 0), 0);
      const bRelevance = bTags.reduce((acc, tag) => acc + (tag.includes(query) ? 1 : 0), 0);
      return bRelevance - aRelevance;
    });

    setSearchResults(results);
    setCurrentPage(1); // Reset to the first page on new search
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

  const handleSelectAll = (type, select) => {
    if (type === 'item') {
      const updatedItems = {};
      Object.keys(selectedItems).forEach(item => {
        updatedItems[item] = select;
      });
      setSelectedItems(updatedItems);
    } else if (type === 'campus') {
      const updatedCampuses = {};
      Object.keys(selectedCampuses).forEach(campus => {
        updatedCampuses[campus] = select;
      });
      setSelectedCampuses(updatedCampuses);
    } else if (type === 'room') {
      const updatedRooms = {};
      Object.keys(selectedRooms).forEach(room => {
        updatedRooms[room] = select;
      });
      setSelectedRooms(updatedRooms);
    }
  };

  const getContainsList = (item) => {
    const containedItems = inventory.filter(i => i.ShelfContainer === item.ID);
    const counts = {};

    containedItems.forEach(i => {
      const key = (['Student Desks', 'Grey Chairs', 'Metal Chairs'].includes(i.Item) && i.Description)
        ? `${i.Description} ${i.Item}`
        : i.Item;
      counts[key] = (counts[key] || 0) + 1;
    });

    return (
      <Box mt={2}>
        <Text>Contains:</Text>
        <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
          {Object.keys(counts).map((key, index) => (
            <li key={index}>{counts[key]} {key}</li>
          ))}
        </ul>
      </Box>
    );
  };

  const totalPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE);

  const paginatedResults = searchResults.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE
  );

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
      <Box mt={4}>
        <Button onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}>Filter</Button>
        <Collapse in={filterDropdownOpen} animateOpacity>
          <Stack direction="row" spacing={8} mt={4} justify="center">
            <Box>
              <Text fontWeight="bold">Item</Text>
              <Button size="xs" onClick={() => handleSelectAll('item', true)}>Select All</Button>
              <Button size="xs" ml={2} onClick={() => handleSelectAll('item', false)}>Deselect All</Button>
              <Box maxHeight="200px" overflowY="auto" mt={2}>
                {Object.keys(selectedItems).map((item, index) => (
                  <Checkbox
                    key={index}
                    isChecked={selectedItems[item]}
                    onChange={(e) => setSelectedItems(prev => ({ ...prev, [item]: e.target.checked }))}
                  >
                    {item}
                  </Checkbox>
                ))}
              </Box>
            </Box>
            <Box>
              <Text fontWeight="bold">Campus</Text>
              <Button size="xs" onClick={() => handleSelectAll('campus', true)}>Select All</Button>
              <Button size="xs" ml={2} onClick={() => handleSelectAll('campus', false)}>Deselect All</Button>
              <Box maxHeight="200px" overflowY="auto" mt={2}>
                {Object.keys(selectedCampuses).map((campus, index) => (
                  <Checkbox
                    key={index}
                    isChecked={selectedCampuses[campus]}
                    onChange={(e) => setSelectedCampuses(prev => ({ ...prev, [campus]: e.target.checked }))}
                  >
                    {campus}
                  </Checkbox>
                ))}
              </Box>
            </Box>
            <Box>
              <Text fontWeight="bold">Room</Text>
              <Button size="xs" onClick={() => handleSelectAll('room', true)}>Select All</Button>
              <Button size="xs" ml={2} onClick={() => handleSelectAll('room', false)}>Deselect All</Button>
              <Box maxHeight="200px" overflowY="auto" mt={2}>
                {Object.keys(selectedRooms).map((room, index) => (
                  <Checkbox
                    key={index}
                    isChecked={selectedRooms[room]}
                    onChange={(e) => setSelectedRooms(prev => ({ ...prev, [room]: e.target.checked }))}
                  >
                    {room}
                  </Checkbox>
                ))}
              </Box>
            </Box>
          </Stack>
        </Collapse>
      </Box>
      {paginatedResults.length > 0 && (
        <SimpleGrid columns={1} spacing={4} mt={8}>
          {paginatedResults.map((item, index) => (
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
                    {getContainsList(item)}
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
      {totalPages > 1 && (
        <HStack mt={4} justify="center">
          <Button onClick={() => setCurrentPage(page => Math.max(page - 1, 1))} disabled={currentPage === 1}>
            Previous
          </Button>
          <Text>Page {currentPage} of {totalPages}</Text>
          <Button onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages}>
            Next
          </Button>
        </HStack>
      )}
    </Box>
  );
}
