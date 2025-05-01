export const getLocation = async () => {
  console.log('开始获取设备位置');
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'wgs84',
      success: async (res) => {
        console.log('成功获取设备位置:', res);
        try {
          console.log('开始进行高德地图逆地理编码');
          const response = await new Promise((resolve, reject) => {
            uni.request({
              url: 'https://restapi.amap.com/v3/geocode/regeo',
              data: {
                location: `${res.longitude},${res.latitude}`,
                key: 'YOUR_LOCATION_KEY',
                extensions: 'all'
              },
              success: (res) => resolve(res),
              fail: (err) => reject(err)
            });
          });
          console.log('高德地图逆地理编码成功:', response.data);
          const regeocode = response.data.regeocode;
          resolve({
            city: regeocode.addressComponent.city,
            district: regeocode.addressComponent.district,
            longitude: res.longitude,
            latitude: res.latitude
          });
        } catch (error) {
          console.error('高德地图逆地理编码失败:', error);
          reject(error);
        }
      },
      fail: (error) => {
        console.error('获取设备位置失败:', error);
        // 处理用户未授权的情况
        if (error.errMsg.includes('auth denied')) {
          uni.showModal({
            title: '提示',
            content: '请在设置中开启地理位置权限',
            success: (res) => {
              if (res.confirm) {
                uni.openSetting();
              }
            }
          });
        }
        reject(error);
      }
    });
  });
};

