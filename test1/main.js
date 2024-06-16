document.getElementById('input-file').addEventListener('change', handleFile, false);

function handleFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        processExcelData(jsonData);
    };

    reader.readAsArrayBuffer(file);
}

function processExcelData(data) {
    const headers = data[0];
    const rows = data.slice(1);

    const orderDateIdx = headers.indexOf('订单日期');
    const storeNameIdx = headers.indexOf('门店名称');
    const salesIdx = headers.indexOf('销售额');
    const profitIdx = headers.indexOf('利润额');
    const managerIdx = headers.indexOf('销售经理');

    const orderDateCounts = {};
    const storeSales = {};
    const storeProfit = {};
    const managerSales = {};

    rows.forEach(row => {
        const orderDate = row[orderDateIdx];
        const storeName = row[storeNameIdx];
        const sales = Math.round(parseFloat(row[salesIdx])); // 取整
        const profit = Math.round(parseFloat(row[profitIdx])); // 取整
        const manager = row[managerIdx];

        orderDateCounts[orderDate] = (orderDateCounts[orderDate] || 0) + 1;
        storeSales[storeName] = (storeSales[storeName] || 0) + sales;
        storeProfit[storeName] = (storeProfit[storeName] || 0) + profit;
        managerSales[manager] = (managerSales[manager] || 0) + sales;
    });

    const orderDateData = Object.keys(orderDateCounts).map(key => ({ name: key, value: orderDateCounts[key] }));
    const storeNames = Object.keys(storeSales);
    const storeSalesData = storeNames.map(name => Math.round(storeSales[name])); // 取整
    const storeProfitData = storeNames.map(name => Math.round(storeProfit[name])); // 取整
    const managerSalesData = Object.keys(managerSales).map(key => ({ name: key, value: Math.round(managerSales[key]) })); // 取整

    initCharts(orderDateData, storeNames, storeSalesData, storeProfitData, managerSalesData);
    loadMapData();
}

function initCharts(orderDateData, storeNames, storeSalesData, storeProfitData, managerSalesData) {
    const orderDateChart = echarts.init(document.getElementById('order-date-chart'));
    const storeChart = echarts.init(document.getElementById('store-chart'));
    const managerSalesChart = echarts.init(document.getElementById('manager-sales-chart'));

    // 配置并显示图表
    orderDateChart.setOption({
        title: { text: '订单日期分布图', left: 'center', subtext: '订单日期', textStyle: { color: 'maroon', fontSize: '32px' } },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: orderDateData.map(item => item.name) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: orderDateData.map(item => item.value) }],
        dataZoom: [{ type: 'inside' }, { type: 'slider' }]
    });

    storeChart.setOption({
        title: { text: '门店销售额和利润额' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: storeNames },
        yAxis: [
            { type: 'value', name: '销售额' },
            { type: 'value', name: '利润额' }
        ],
        series: [
            { name: '销售额', type: 'bar', data: storeSalesData },
            { name: '利润额', type: 'line', yAxisIndex: 1, data: storeProfitData }
        ],
        dataZoom: [{ type: 'inside' }, { type: 'slider' }]
    });

    managerSalesChart.setOption({
        title: { text: '销售经理销售额' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: managerSalesData.map(item => item.name) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: managerSalesData.map(item => item.value) }],
        dataZoom: [{ type: 'inside' }, { type: 'slider' }]
    });
}

function loadMapData() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            initMap(data);
        })
        .catch(error => console.error('Error loading map data:', error));
}

function initMap(mapData) {
    const map = new BMap.Map("map-container");
    map.centerAndZoom(new BMap.Point(116.404, 39.915), 5);
    map.enableScrollWheelZoom(true);

    mapData.forEach(item => {
        const point = new BMap.Point(item.lng, item.lat);
        const marker = new BMap.Marker(point, {
            icon: new BMap.Symbol(BMap_Symbol_SHAPE_POINT, {
                scale: Math.log(item.count + 1) / 2, // 缩小标记的大小
                fillColor: 'red',
                fillOpacity: 0.8
            })
        });
        map.addOverlay(marker);
    });
}
