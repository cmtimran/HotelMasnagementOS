import { useState } from 'react';
import { Calendar, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';

interface ForecastDay {
    date: string;
    totalRooms: number;
    bookedRooms: number;
    occupancyRate: number;
    revenue: number;
    arrivals: number;
    departures: number;
    stayovers: number;
}

const OccupancyForecast = () => {
    const [forecastDays] = useState(30);

    // Generate mock forecast data
    const generateForecast = (): ForecastDay[] => {
        const forecast: ForecastDay[] = [];
        const today = new Date();
        const totalRooms = 100;

        for (let i = 0; i < forecastDays; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            // Mock data with some variation
            const baseOccupancy = 60 + Math.random() * 30;
            const bookedRooms = Math.floor((baseOccupancy / 100) * totalRooms);
            const occupancyRate = (bookedRooms / totalRooms) * 100;
            const avgRate = 150 + Math.random() * 50;
            const revenue = bookedRooms * avgRate;

            forecast.push({
                date: date.toISOString().split('T')[0],
                totalRooms,
                bookedRooms,
                occupancyRate,
                revenue,
                arrivals: Math.floor(Math.random() * 20) + 5,
                departures: Math.floor(Math.random() * 20) + 5,
                stayovers: bookedRooms - Math.floor(Math.random() * 10)
            });
        }

        return forecast;
    };

    const [forecast] = useState<ForecastDay[]>(generateForecast());

    const avgOccupancy = forecast.reduce((sum, day) => sum + day.occupancyRate, 0) / forecast.length;
    const totalRevenue = forecast.reduce((sum, day) => sum + day.revenue, 0);
    const totalArrivals = forecast.reduce((sum, day) => sum + day.arrivals, 0);

    const getOccupancyColor = (rate: number) => {
        if (rate >= 80) return 'bg-green-100 text-green-800';
        if (rate >= 60) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Calendar size={28} />
                        Occupancy Forecast - Next {forecastDays} Days
                    </h1>
                    <p className="text-gray-600">Booking pace and occupancy predictions</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Avg Occupancy</span>
                            <TrendingUp className="text-blue-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{avgOccupancy.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500 mt-1">Next {forecastDays} days</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                            <DollarSign className="text-green-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">${(totalRevenue / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-gray-500 mt-1">Projected</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Total Arrivals</span>
                            <Users className="text-purple-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{totalArrivals}</p>
                        <p className="text-xs text-gray-500 mt-1">Expected guests</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Peak Day</span>
                            <AlertTriangle className="text-orange-500" size={20} />
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                            {forecast.reduce((max, day) => day.occupancyRate > max.occupancyRate ? day : max).date}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Highest occupancy</p>
                    </div>
                </div>

                {/* Forecast Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Daily Forecast</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Occupancy</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rooms</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Arrivals</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Departures</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stayovers</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {forecast.slice(0, 14).map((day) => (
                                    <tr key={day.date} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getOccupancyColor(day.occupancyRate)}`}>
                                                {day.occupancyRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                                            {day.bookedRooms}/{day.totalRooms}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                            ${day.revenue.toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-900">{day.arrivals}</td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-900">{day.departures}</td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-900">{day.stayovers}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                        Showing first 14 days of {forecastDays}-day forecast
                    </div>
                </div>

                {/* Alerts */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            Low Occupancy Alert:
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {forecast.filter(d => d.occupancyRate < 50).slice(0, 3).map(d => (
                                <li key={d.date}>• {d.date}: {d.occupancyRate.toFixed(1)}% occupancy</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            <TrendingUp size={18} />
                            High Demand Days:
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {forecast.filter(d => d.occupancyRate > 80).slice(0, 3).map(d => (
                                <li key={d.date}>• {d.date}: {d.occupancyRate.toFixed(1)}% occupancy</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OccupancyForecast;
