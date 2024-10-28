import React, { useState, useEffect } from 'react';
import { Select, Box, Text, Flex } from '@chakra-ui/react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function AddPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userChartData, setUserChartData] = useState(null);
  const [filteredChartData, setFilteredChartData] = useState(null);

  useEffect(() => {
    // Fetch user list only once on component mount
    const fetchUsers = async () => {
      try {
        const response = await fetch("https://sheetdb.io/api/v1/ubvot5aspyupb?sheet=Users");
        const data = await response.json();
        setUsers(data.map(user => user.Users));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserData(selectedUser);
    }
  }, [selectedUser]);

  const fetchUserData = async (user) => {
    try {
      const response = await fetch("https://sheetdb.io/api/v1/ubvot5aspyupb?sheet=Data");
      const data = await response.json();

      if (!data.length || !data[0].Suwar || !(user in data[0])) {
        console.error("Data format error: 'Suwar' or user column not found");
        return;
      }

      const userData = data.map(row => ({
        suwar: row.Suwar,
        value: parseInt(row[user], 10),
      }));

      // Set chart data only if userData is valid and non-empty
      setUserChartData(prepareChartData(userData, false));
      setFilteredChartData(prepareChartData(userData, true));
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const prepareChartData = (data, excludeZeros) => {
    const filteredData = data.filter(item => !excludeZeros || item.value > 0);
    const labels = filteredData.map(item => item.suwar);
    const backgroundColor = filteredData.map(item => {
      if (item.value === 0) return 'grey';
      if (item.value === 1) return 'red';
      return 'green';
    });

    return {
      labels,
      datasets: [{
        data: Array(labels.length).fill(1),
        backgroundColor,
      }],
    };
  };

  if (!selectedUser) {
    return (
      <Box>
        <Text fontSize="2xl" mb={4}>Login</Text>
        <Select placeholder="Select User" onChange={(e) => setSelectedUser(e.target.value)}>
          {users.map(user => (
            <option key={user} value={user}>{user}</option>
          ))}
        </Select>
      </Box>
    );
  }

  return (
    <Box textAlign="center">
      <Text fontSize="2xl">Hello, {selectedUser}</Text>
      <Flex justify="center" mt={8} gap={4}>
        <Box width="350px" height="350px">
          <Text fontSize="lg" mb={2}>All Suwar Data</Text>
          {userChartData ? (
            <Pie
              data={userChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    enabled: false,
                  },
                  datalabels: {
                    color: 'black',
                    font: {
                      size: 10,
                      weight: 'bold',
                    },
                    anchor: 'end',
                    align: 'start',
                    clamp: true,
                    rotation: (context) => {
                      const { dataIndex, dataset } = context;
                      const totalSlices = dataset.data.length;
                      return ((dataIndex / totalSlices) * 360) + 90;
                    },
                    formatter: (value, context) => context.chart.data.labels[context.dataIndex],
                  },
                },
              }}
            />
          ) : (
            <Text>Loading data...</Text>
          )}
        </Box>

        <Box width="350px" height="350px">
          <Text fontSize="lg" mb={2}>Filtered Suwar Data (Excluding 0)</Text>
          {filteredChartData ? (
            <Pie
              data={filteredChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    enabled: false,
                  },
                  datalabels: {
                    color: 'black',
                    font: {
                      size: 10,
                      weight: 'bold',
                    },
                    anchor: 'end',
                    align: 'start',
                    clamp: true,
                    rotation: (context) => {
                      const { dataIndex, dataset } = context;
                      const totalSlices = dataset.data.length;
                      return ((dataIndex / totalSlices) * 360) + 90;
                    },
                    formatter: (value, context) => context.chart.data.labels[context.dataIndex],
                  },
                },
              }}
            />
          ) : (
            <Text>Loading data...</Text>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
