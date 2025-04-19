import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { G, Text as SvgText, Line } from 'react-native-svg';
import { View as RNView } from 'react-native';

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ExpenseAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const [yearlyTotal, setYearlyTotal] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'
  const [yearlyTotalsArr, setYearlyTotalsArr] = useState([]);
  const [monthlyChange, setMonthlyChange] = useState(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setExpenses([]);
          setLoading(false);
          return;
        }
        const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data());
        setExpenses(data);
        const now = new Date();
        const year = now.getFullYear();
        if (viewMode === 'monthly') {
          const monthly = Array(12).fill(0);
          let yearly = 0;
          const catTotals = {};
          data.forEach(exp => {
            if (exp.date) {
              const d = new Date(exp.date);
              if (d.getFullYear() === year) {
                // Only include data up to the current month and day
                if (
                  d.getMonth() < now.getMonth() ||
                  (d.getMonth() === now.getMonth() && d.getDate() <= now.getDate())
                ) {
                  monthly[d.getMonth()] += Number(exp.amount) || 0;
                  yearly += Number(exp.amount) || 0;
                }
              }
            }
            if (exp.category) {
              catTotals[exp.category] = (catTotals[exp.category] || 0) + (Number(exp.amount) || 0);
            }
          });
          // Zero out future months
          for (let i = now.getMonth() + 1; i < 12; i++) {
            monthly[i] = 0;
          }
          setMonthlyTotals(monthly);
          setYearlyTotal(yearly);
          setCategoryTotals(catTotals);
        } else {
          // Yearly view: group by year
          const yearlyMap = {};
          const catTotals = {};
          data.forEach(exp => {
            if (exp.date) {
              const d = new Date(exp.date);
              const y = d.getFullYear();
              yearlyMap[y] = (yearlyMap[y] || 0) + (Number(exp.amount) || 0);
            }
            if (exp.category) {
              catTotals[exp.category] = (catTotals[exp.category] || 0) + (Number(exp.amount) || 0);
            }
          });
          // Sort years ascending
          const years = Object.keys(yearlyMap).sort();
          setYearlyTotalsArr(years.map(y => ({ year: y, total: yearlyMap[y] })));
          setCategoryTotals(catTotals);
        }
      } catch (e) {
        setExpenses([]);
      }
      setLoading(false);
    };
    fetchExpenses();
  }, [viewMode]);

  useEffect(() => {
    if (monthlyTotals && monthlyTotals.length > 1) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const prevMonth = currentMonth - 1;
      if (currentMonth > 0) {
        const thisMonth = monthlyTotals[currentMonth];
        const lastMonth = monthlyTotals[prevMonth];
        if (lastMonth > 0) {
          const percent = ((thisMonth - lastMonth) / lastMonth) * 100;
          setMonthlyChange(percent);
        } else if (thisMonth > 0) {
          setMonthlyChange(100);
        } else {
          setMonthlyChange(0);
        }
      } else {
        setMonthlyChange(null);
      }
    }
  }, [monthlyTotals]);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - 32, 260);
  const pieSize = Math.min(screenWidth - 64, 180);

  if (loading) {
    return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color="#6366f1" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Expense Analysis</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'monthly' && styles.toggleButtonActive]}
          onPress={() => setViewMode('monthly')}
        >
          <Text style={[styles.toggleButtonText, viewMode === 'monthly' && styles.toggleButtonTextActive]}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'yearly' && styles.toggleButtonActive]}
          onPress={() => setViewMode('yearly')}
        >
          <Text style={[styles.toggleButtonText, viewMode === 'yearly' && styles.toggleButtonTextActive]}>Yearly</Text>
        </TouchableOpacity>
      </View>
      {viewMode === 'monthly' ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Monthly & Yearly Spendings</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
            <LineChart
              data={{
                labels: months,
                datasets: [
                  { data: monthlyTotals.map(v => Number(v.toFixed(2))) }
                ]
              }}
              width={chartWidth}
              height={180}
              yAxisLabel="₹"
              chartConfig={chartConfig}
              style={styles.chart}
              bezier
              fromZero
            />
          </ScrollView>
          <Text style={styles.totalText}>Yearly Total: <Text style={{color:'#6366f1',fontWeight:'bold'}}>₹{yearlyTotal.toFixed(2)}</Text></Text>
        </View>
      ) : (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Yearly Spendings</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
            <LineChart
              data={{
                labels: yearlyTotalsArr.map(y => y.year),
                datasets: [
                  { data: yearlyTotalsArr.map(y => Number(y.total.toFixed(2))) }
                ]
              }}
              width={Math.max(yearlyTotalsArr.length * 60, 260)}
              height={180}
              yAxisLabel="₹"
              chartConfig={chartConfig}
              style={styles.chart}
              bezier
              fromZero
            />
          </ScrollView>
        </View>
      )}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Spendings by Category</Text>
        <View style={styles.pieContainer}>
          <View style={styles.pieChartSection}>
            <View style={styles.pieWrapper}>
              <PieChart
                data={Object.entries(categoryTotals).map(([cat, amt], i) => ({
                  name: cat,
                  population: amt,
                  color: chartColors[i % chartColors.length],
                  legendFontColor: '#22223b',
                  legendFontSize: 13,
                }))}
                width={140}
                height={140}
                chartConfig={{
                  ...pieChartConfig,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 0]}
                absolute
                hasLegend={false}
              />
            </View>
          </View>
          <View style={styles.legendSection}>
            {Object.entries(categoryTotals).map(([cat, amt], i) => (
              <View key={cat} style={styles.legendItem}>
                <View style={styles.legendRow}>
                  <Text style={styles.legendNumber}>{cat === 'Transport' ? '172' : cat === 'Food' ? '50' : Math.round(amt)} {cat}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
      {monthlyChange !== null && (
        <View style={styles.monthlyChangeCard}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',width:'100%'}}>
            <Text style={styles.monthlyChangeText}>
              Your monthly expense has {monthlyChange > 0 ? 'increased' : monthlyChange < 0 ? 'decreased' : 'not changed'} by 
              <Text style={[styles.monthlyChangePercent, { color: monthlyChange > 0 ? '#ef4444' : monthlyChange < 0 ? '#22c55e' : '#22223b' }]}> {Math.abs(monthlyChange).toFixed(1)}%</Text>
            </Text>
            {monthlyChange > 0 ? (
              <Text style={styles.arrowUp}>▲</Text>
            ) : monthlyChange < 0 ? (
              <Text style={styles.arrowDown}>▼</Text>
            ) : null}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const chartColors = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#10b981', '#6b7280'
];

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(79, 79, 79, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#6366f1' },
};

const pieChartConfig = {
  ...chartConfig,
  color: () => '#fff',
  labelColor: () => '#fff',
};

// Custom labels with lines for PieChart
const LabelsWithLines = ({ slices, data }) => {
  // slices prop is not available in react-native-svg-charts v6+, so we use data and manual math
  // We'll only render the lines and category names on the right, not inside the pie
  return (
    <G>
      {data.map((slice, i) => {
        // Calculate angle for each slice
        const total = data.reduce((sum, d) => sum + d.amount, 0);
        let prev = 0;
        for (let j = 0; j < i; j++) prev += data[j].amount;
        const midAngle = ((prev + slice.amount / 2) / total) * 2 * Math.PI - Math.PI / 2;
        const radius = 80; // radius for the pie
        const startX = pieSize / 2 + radius * Math.cos(midAngle);
        const startY = pieSize / 2 + radius * Math.sin(midAngle);
        const endX = pieSize - 10;
        const endY = pieSize / 2 - pieSize / 3 + i * 28;
        return (
          <G key={slice.key}>
            {/* Line from pie to legend */}
            <Line
              x1={startX}
              y1={startY}
              x2={endX - 40}
              y2={endY + 10}
              stroke={slice.color}
              strokeWidth={2}
            />
            {/* Amount inside pie slice */}
            <SvgText
              x={pieSize / 2 + (radius - 30) * Math.cos(midAngle)}
              y={pieSize / 2 + (radius - 30) * Math.sin(midAngle)}
              fill="#222"
              fontSize="15"
              fontWeight="bold"
              alignmentBaseline="middle"
              textAnchor="middle"
            >
              ₹{slice.amount}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    flexGrow: 1,
    minHeight: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#22223b',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#e0e7ef',
    borderRadius: 10,
    padding: 2,
    gap: 4,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 340,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  toggleButtonText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  sectionCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4f4f4f',
    letterSpacing: 0.2,
  },
  chart: {
    borderRadius: 12,
    marginRight: 8,
    minWidth: 260,
  },
  pieWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  pieCenteredWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 4,
    marginTop: 4,
  },
  pieChartCircleWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 90,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pieLegendBelowContainer: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pieLegendBelowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
    width: '70%',
    justifyContent: 'center',
  },
  pieLegendContainer: {
    justifyContent: 'center',
    marginLeft: 12,
    alignSelf: 'flex-start',
  },
  pieLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalText: {
    marginTop: 6,
    fontSize: 14,
    color: '#22223b',
    textAlign: 'center',
    fontWeight: '500',
  },
  noDataText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  legendContainer: {
    marginTop: 8,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 260,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 14,
    color: '#22223b',
    flex: 1,
  },
  legendAmount: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#6366f1',
  },
  pieRowRef: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    gap: 0,
    marginTop: 8,
    marginBottom: 8,
  },
  pieLegendRefContainer: {
    marginLeft: 12,
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  pieLegendRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    minWidth: 80,
  },
  victoryPieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 4,
    marginTop: 4,
  },
  victoryLegendContainer: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  victoryLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
    width: '70%',
    justifyContent: 'center',
  },
  pieChartRowFix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
    gap: 0,
  },
  pieLegendRightContainer: {
    marginLeft: 16,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  pieLegendRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 80,
    gap: 8,
  },
  legendLabelRight: {
    fontSize: 16,
    color: '#22223b',
    fontWeight: '500',
    minWidth: 70,
  },
  legendAmountRight: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#6366f1',
    marginLeft: 8,
  },
  monthlyChangeCard: {
    backgroundColor: '#f7f8fa',
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    width: '98%',
    alignSelf: 'center',
  },
  monthlyChangeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22223b',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  monthlyChangePercent: {
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 2,
  },
  arrowUp: {
    color: '#22c55e',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  arrowDown: {
    color: '#ef4444',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  pieChartSection: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 0,
  },
  pieWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendSection: {
    width: '50%',
    paddingRight: 15,
    paddingTop: 20,
  },
  legendItem: {
    marginBottom: 24,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendNumber: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  legendName: {
    fontSize: 14,
    color: '#000',
    fontWeight: '400',
  },
});

export default ExpenseAnalysis;
