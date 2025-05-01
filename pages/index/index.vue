<template>
  <view class="container">
    <!-- 定位部分 -->
    <view class="header card">
      <button class="location-btn" @click="getLocation">获取当前位置</button>
      <text class="location-text">{{ currentLocation }}</text>
    </view>
    
    <!-- 天气和空气质量显示部分 -->
    <view class="body">
      <view v-if="weatherData" class="weather-card card">
        <view class="weather-basic">
          <text class="weather-text">天气: {{ weatherData.weather }}</text>
          <text class="temp-text">温度: {{ weatherData.temperature }}°C</text>
          <text class="aqi-text">空气质量指数: {{ weatherData.aqi }}</text>
        </view>
        
        <view class="air-quality-details">
          <text>PM10: {{ weatherData.pm10 }}</text>
          <text>PM2.5: {{ weatherData.pm25 }}</text>
          <text>臭氧: {{ weatherData.o3 }}</text>
          <text>二氧化氮: {{ weatherData.no2 }}</text>
          <text>二氧化硫: {{ weatherData.so2 }}</text>
          <text>一氧化碳: {{ weatherData.co }}</text>
        </view>
      </view>
      
      <!-- 温度图表 -->
      <view class="chart-container">
        <view class="chart-title">温度变化 (°C)</view>
        <view class="chart card">
          <canvas canvas-id="tempChart" id="tempChart" class="charts"></canvas>
        </view>
      </view>
      
      <!-- 湿度图表 -->
      <view class="chart-container">
        <view class="chart-title">湿度变化 (%)</view>
        <view class="chart card">
          <canvas canvas-id="humidityChart" id="humidityChart" class="charts"></canvas>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getLocation as getAmapLocation } from '@/utils/location';
import uCharts from '@/node_modules/@qiun/ucharts/u-charts.js';

let uChartsInstance = {};

export default {
  data() {
    return {
      currentLocation: '',
      weatherData: null,
      cWidth: 750,
      cHeight: 300
    };
  },
  onReady() {
    this.cWidth = uni.upx2px(750);
    this.cHeight = uni.upx2px(300);
  },
  methods: {
    async getLocation() {
      try {
        const location = await getAmapLocation();
        this.currentLocation = `${location.city} - ${location.district}`;
        await this.getWeatherData(location);
      } catch (error) {
        console.error('获取位置失败:', error);
      }
    },
    async getWeatherData(location) {
      try {
        const { longitude, latitude } = location;
        const [weatherRes, aqiRes] = await Promise.all([
          new Promise((resolve, reject) => {
            uni.request({
              url: 'https://dev.qweatherapi.com/v7/weather/7d', // 修改为7天
              data: {
                location: `${longitude},${latitude}`,
                key: 'YOUR_WEATHER_KEY'
              },
              success: (res) => resolve(res.data),
              fail: (err) => reject(err)
            });
          }),
          new Promise((resolve, reject) => {
            uni.request({
              url: 'https://dev.qweatherapi.com/v7/air/now',
              data: {
                location: `${longitude},${latitude}`,
                key: 'YOUR_WEATHER_KEY'
              },
              success: (res) => resolve(res.data),
              fail: (err) => reject(err)
            });
          })
        ]);

        // 格式化日期函数
        const formatDate = (dateStr) => {
          const date = new Date(dateStr);
          return `${date.getMonth()+1}/${date.getDate()}`; // 格式化为月/日
        };

        this.weatherData = {
          weather: weatherRes.daily[0].textDay,
          temperature: weatherRes.daily[0].tempMax,
          aqi: aqiRes.now.aqi,
          pm10: aqiRes.now.pm10,
          pm25: aqiRes.now.pm2p5,
          o3: aqiRes.now.o3,
          no2: aqiRes.now.no2,
          so2: aqiRes.now.so2,
          co: aqiRes.now.co,
          dailyData: weatherRes.daily // 保存完整的3天数据
        };

        // 绘制温湿度图表
        this.drawTempHumidityChart(weatherRes.daily.map(day => ({
          ...day,
          formattedDate: formatDate(day.fxDate) // 添加格式化日期
        })));
      } catch (error) {
        console.error('获取天气数据失败:', error);
      }
    },
    drawTempHumidityChart(dailyData) {
      // 温度图表
      const tempChartData = {
        categories: dailyData.map(item => item.formattedDate), // 使用格式化日期
        series: [
          {
            name: "最高温度",
            data: dailyData.map(item => item.tempMax)
          },
          {
            name: "最低温度",
            data: dailyData.map(item => item.tempMin)
          }
        ]
      };
      
      // 湿度图表
      const humidityChartData = {
        categories: dailyData.map(item => item.formattedDate), // 使用格式化日期
        series: [
          {
            name: "湿度",
            data: dailyData.map(item => item.humidity)
          }
        ]
      };
      
      // 绘制温度图表
      this.drawChart('tempChart', tempChartData, ["#EE6666", "#91CB74"]);
      // 绘制湿度图表
      this.drawChart('humidityChart', humidityChartData, ["#73C0DE"]);
    },
    drawChart(id, data, colors) {
      const ctx = uni.createCanvasContext(id, this);
      uChartsInstance[id] = new uCharts({
        type: "line",
        context: ctx,
        width: this.cWidth,
        height: this.cHeight,
        categories: data.categories,
        series: data.series,
        animation: true,
        background: "#FFFFFF",
        color: colors,
        padding: [15, 10, 0, 15],
        enableScroll: false,
        legend: {
          position: 'top',
          float: 'center'
        },
        xAxis: {
          disableGrid: true,
          axisLine: true
        },
        yAxis: {
          gridType: "dash",
          dashLength: 2,
          splitNumber: 5
        },
        extra: {
          line: {
            type: "curve",
            width: 2,
            activeType: "point"
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #f0f2f5;
}

.card {
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 20rpx;
  padding: 20rpx;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.location-btn {
  background-color: #1890ff;
  color: white;
  border-radius: 8rpx;
  padding: 12rpx 24rpx;
  margin-bottom: 12rpx;
}

.location-text {
  font-size: 28rpx;
  color: #333;
}

.weather-card {
  display: flex;
  flex-direction: column;
}

.weather-basic {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.weather-text, .temp-text, .aqi-text {
  font-size: 28rpx;
  color: #333;
}

.air-quality-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  font-size: 24rpx;
  color: #666;
}

.chart-container {
  margin-bottom: 20rpx;
}

.chart-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.charts {
  width: 750rpx;
  height: 300rpx;
}
</style>