import { useState, useMemo, useEffect } from 'react'
import { useDailySummary } from '../hooks/useDailySummary'
import { useWeeklySummary } from '../hooks/useWeeklySummary'
import { useHubs } from '../hooks/useHubs'
import { useAllBookings } from '../hooks/useAllBookings'
import { useAllDrivers } from '../hooks/useAllDrivers'
import { useAllVehicles } from '../hooks/useAllVehicles'
import { useSubscriptions } from '../hooks/useSubscriptions'
import { supabase } from '../lib/supabase'
import { exportToCSV } from '../utils/csvExport'
import type { TripListItem } from '../hooks/useTodayTrips'

export function Reports() {
  const [activeTab, setActiveTab] = useState(0)
  
  // Daily report state
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyHub, setDailyHub] = useState<string>('')
  
  // Weekly report state
  const [weeklyStartDate, setWeeklyStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [weeklyEndDate, setWeeklyEndDate] = useState(new Date().toISOString().split('T')[0])
  const [weeklyHub, setWeeklyHub] = useState<string>('')

  // Monthly report state
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1)
  const [monthlyHub, setMonthlyHub] = useState<string>('')

  // Custom report state
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0])
  const [customHub, setCustomHub] = useState<string>('')

  // Trip-wise report state
  const [tripWiseDateRange, setTripWiseDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [tripWiseDate, setTripWiseDate] = useState(new Date().toISOString().split('T')[0])
  const [tripWiseStartDate, setTripWiseStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [tripWiseEndDate, setTripWiseEndDate] = useState(new Date().toISOString().split('T')[0])
  const [tripWiseType, setTripWiseType] = useState<string>('')
  const [tripWiseStatus, setTripWiseStatus] = useState<string>('')
  const [tripWiseHub, setTripWiseHub] = useState<string>('')
  const [tripWiseDriver, setTripWiseDriver] = useState<string>('')
  const [tripWiseVehicle, setTripWiseVehicle] = useState<string>('')
  const [tripWisePayments, setTripWisePayments] = useState<Record<string, { method: string | null; comment: string | null }>>({})

  // Driver performance report state
  const [driverPerfDateRange, setDriverPerfDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [driverPerfDate, setDriverPerfDate] = useState(new Date().toISOString().split('T')[0])
  const [driverPerfStartDate, setDriverPerfStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [driverPerfEndDate, setDriverPerfEndDate] = useState(new Date().toISOString().split('T')[0])
  const [driverPerfDriver, setDriverPerfDriver] = useState<string>('')
  const [driverPerfPayments, setDriverPerfPayments] = useState<Record<string, { method: string | null }>>({})

  // Vehicle utilization report state
  const [vehicleUtilDateRange, setVehicleUtilDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [vehicleUtilDate, setVehicleUtilDate] = useState(new Date().toISOString().split('T')[0])
  const [vehicleUtilStartDate, setVehicleUtilStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [vehicleUtilEndDate, setVehicleUtilEndDate] = useState(new Date().toISOString().split('T')[0])
  const [vehicleUtilVehicle, setVehicleUtilVehicle] = useState<string>('')

  // Customer analysis report state
  const [customerAnalysisDateRange, setCustomerAnalysisDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [customerAnalysisDate, setCustomerAnalysisDate] = useState(new Date().toISOString().split('T')[0])
  const [customerAnalysisStartDate, setCustomerAnalysisStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [customerAnalysisEndDate, setCustomerAnalysisEndDate] = useState(new Date().toISOString().split('T')[0])
  const [customerAnalysisPayments, setCustomerAnalysisPayments] = useState<Record<string, { method: string | null }>>({})

  // Hub performance report state
  const [hubPerfDateRange, setHubPerfDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [hubPerfDate, setHubPerfDate] = useState(new Date().toISOString().split('T')[0])
  const [hubPerfStartDate, setHubPerfStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [hubPerfEndDate, setHubPerfEndDate] = useState(new Date().toISOString().split('T')[0])
  const [hubPerfHub, setHubPerfHub] = useState<string>('')

  // Revenue analysis report state
  const [revenueAnalysisDateRange, setRevenueAnalysisDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [revenueAnalysisDate, setRevenueAnalysisDate] = useState(new Date().toISOString().split('T')[0])
  const [revenueAnalysisStartDate, setRevenueAnalysisStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [revenueAnalysisEndDate, setRevenueAnalysisEndDate] = useState(new Date().toISOString().split('T')[0])
  const [revenueAnalysisPayments, setRevenueAnalysisPayments] = useState<Record<string, { method: string | null }>>({})

  // Payment mode analysis report state
  const [paymentModeDateRange, setPaymentModeDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [paymentModeDate, setPaymentModeDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentModeStartDate, setPaymentModeStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [paymentModeEndDate, setPaymentModeEndDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentModePayments, setPaymentModePayments] = useState<Record<string, { method: string | null; status: string | null; amount: number | null }>>({})

  // Peak hours/days report state
  const [peakHoursDateRange, setPeakHoursDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [peakHoursDate, setPeakHoursDate] = useState(new Date().toISOString().split('T')[0])
  const [peakHoursStartDate, setPeakHoursStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [peakHoursEndDate, setPeakHoursEndDate] = useState(new Date().toISOString().split('T')[0])

  // Cancellation report state
  const [cancellationDateRange, setCancellationDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().split('T')[0])
  const [cancellationStartDate, setCancellationStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [cancellationEndDate, setCancellationEndDate] = useState(new Date().toISOString().split('T')[0])

  // Subscription performance report state
  const [subscriptionPerfDateRange, setSubscriptionPerfDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [subscriptionPerfDate, setSubscriptionPerfDate] = useState(new Date().toISOString().split('T')[0])
  const [subscriptionPerfStartDate, setSubscriptionPerfStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [subscriptionPerfEndDate, setSubscriptionPerfEndDate] = useState(new Date().toISOString().split('T')[0])

  const { data: hubs } = useHubs()
  const { data: allDrivers } = useAllDrivers()
  const { data: allVehicles } = useAllVehicles()

  // Calculate driver performance date range
  const driverPerfDateFrom = useMemo(() => {
    if (driverPerfDateRange === 'day') {
      return driverPerfDate
    } else if (driverPerfDateRange === 'week') {
      return driverPerfStartDate
    } else if (driverPerfDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    } else {
      return driverPerfStartDate
    }
  }, [driverPerfDateRange, driverPerfDate, driverPerfStartDate])

  const driverPerfDateTo = useMemo(() => {
    if (driverPerfDateRange === 'day') {
      return driverPerfDate
    } else if (driverPerfDateRange === 'week') {
      return driverPerfEndDate
    } else if (driverPerfDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    } else {
      return driverPerfEndDate
    }
  }, [driverPerfDateRange, driverPerfDate, driverPerfEndDate])

  // Get driver name for filter
  const selectedDriverName = useMemo(() => {
    if (!driverPerfDriver) return undefined
    const driver = allDrivers?.find(d => d.id === driverPerfDriver)
    return driver?.name
  }, [driverPerfDriver, allDrivers])

  // Fetch driver performance data
  const { data: driverPerfData, isLoading: driverPerfLoading } = useAllBookings({
    dateFrom: driverPerfDateFrom,
    dateTo: driverPerfDateTo,
    driver: selectedDriverName || undefined,
    includeYesterdayIncomplete: false,
  })

  // Fetch payment details for driver performance
  useEffect(() => {
    if (driverPerfData && driverPerfData.length > 0) {
      const tripIds = driverPerfData.map(trip => trip.id)
      if (tripIds.length > 0) {
        supabase
          .from('payments')
          .select('trip_id, method')
          .in('trip_id', tripIds)
          .eq('status', 'completed')
          .then(({ data, error }) => {
            if (!error && data) {
              const paymentMap: Record<string, { method: string | null }> = {}
              data.forEach((payment: any) => {
                if (payment.trip_id) {
                  const methodMap: Record<string, string> = {
                    'cash': 'Cash',
                    'upi': 'UPI',
                    'others': 'Others',
                  }
                  paymentMap[payment.trip_id] = {
                    method: methodMap[payment.method?.toLowerCase() || ''] || payment.method || null,
                  }
                }
              })
              setDriverPerfPayments(paymentMap)
            } else {
              setDriverPerfPayments({})
            }
          })
      } else {
        setDriverPerfPayments({})
      }
    } else {
      setDriverPerfPayments({})
    }
  }, [driverPerfData])

  // Calculate driver performance metrics
  const driverPerformanceMetrics = useMemo(() => {
    if (!driverPerfData || driverPerfData.length === 0) {
      return null
    }

    // Group by driver name (Note: using name as key - if multiple drivers have same name, they'll be grouped together)
    const driverMap = new Map<string, {
      driverName: string
      trips: TripListItem[]
    }>()

    driverPerfData.forEach(trip => {
      if (trip.driver_name) {
        const driverKey = trip.driver_name
        if (!driverMap.has(driverKey)) {
          driverMap.set(driverKey, {
            driverName: trip.driver_name,
            trips: []
          })
        }
        driverMap.get(driverKey)!.trips.push(trip)
      }
    })

    // Calculate metrics for each driver
    const metrics = Array.from(driverMap.values()).map(driver => {
      const trips = driver.trips
      const totalTrips = trips.length
      const totalRevenue = trips.reduce((sum, t) => sum + (t.fare || 0), 0)
      const totalKm = trips.reduce((sum, t) => {
        const km = t.actual_km ?? t.est_km ?? 0
        return sum + Number(km)
      }, 0)
      
      const avgFarePerTrip = totalTrips > 0 ? totalRevenue / totalTrips : 0
      const avgKmPerTrip = totalTrips > 0 ? totalKm / totalTrips : 0
      
      const completedTrips = trips.filter(t => t.status === 'completed').length
      const cancelledTrips = trips.filter(t => t.status === 'cancelled').length
      const completionRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0
      const cancellationRate = totalTrips > 0 ? (cancelledTrips / totalTrips) * 100 : 0

      // Revenue by trip type
      const revenueByType = {
        subscription: trips.filter(t => t.type === 'subscription').reduce((sum, t) => sum + (t.fare || 0), 0),
        airport: trips.filter(t => t.type === 'airport').reduce((sum, t) => sum + (t.fare || 0), 0),
        rental: trips.filter(t => t.type === 'rental').reduce((sum, t) => sum + (t.fare || 0), 0),
        manual: trips.filter(t => t.type === 'manual').reduce((sum, t) => sum + (t.fare || 0), 0),
      }

      // Payment mode breakdown
      const paymentBreakdown = {
        cash: 0,
        upi: 0,
        others: 0,
      }
      trips.forEach(trip => {
        const payment = driverPerfPayments[trip.id]
        if (payment?.method) {
          if (payment.method === 'Cash') paymentBreakdown.cash += trip.fare || 0
          else if (payment.method === 'UPI') paymentBreakdown.upi += trip.fare || 0
          else paymentBreakdown.others += trip.fare || 0
        }
      })

      // Best/worst performing days
      const dayMap = new Map<string, { revenue: number; trips: number }>()
      trips.forEach(trip => {
        if (trip.start_time) {
          const date = new Date(trip.start_time).toISOString().split('T')[0]
          if (!dayMap.has(date)) {
            dayMap.set(date, { revenue: 0, trips: 0 })
          }
          const dayData = dayMap.get(date)!
          dayData.revenue += trip.fare || 0
          dayData.trips += 1
        }
      })
      
      const daysArray = Array.from(dayMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        trips: data.trips
      }))
      
      const bestDay = daysArray.length > 0 
        ? daysArray.reduce((best, day) => day.revenue > best.revenue ? day : best, daysArray[0])
        : null
      const worstDay = daysArray.length > 0
        ? daysArray.reduce((worst, day) => day.revenue < worst.revenue ? day : worst, daysArray[0])
        : null

      return {
        driverName: driver.driverName,
        totalTrips,
        totalRevenue,
        totalKm,
        avgFarePerTrip,
        avgKmPerTrip,
        completionRate,
        cancellationRate,
        revenueByType,
        paymentBreakdown,
        bestDay: bestDay ? { date: bestDay.date, revenue: bestDay.revenue, trips: bestDay.trips } : null,
        worstDay: worstDay ? { date: worstDay.date, revenue: worstDay.revenue, trips: worstDay.trips } : null,
      }
    })

    return metrics.sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
  }, [driverPerfData, driverPerfPayments])

  // Calculate vehicle utilization date range
  const vehicleUtilDateFrom = useMemo(() => {
    if (vehicleUtilDateRange === 'day') {
      return vehicleUtilDate
    } else if (vehicleUtilDateRange === 'week') {
      return vehicleUtilStartDate
    } else if (vehicleUtilDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    } else {
      return vehicleUtilStartDate
    }
  }, [vehicleUtilDateRange, vehicleUtilDate, vehicleUtilStartDate])

  const vehicleUtilDateTo = useMemo(() => {
    if (vehicleUtilDateRange === 'day') {
      return vehicleUtilDate
    } else if (vehicleUtilDateRange === 'week') {
      return vehicleUtilEndDate
    } else if (vehicleUtilDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    } else {
      return vehicleUtilEndDate
    }
  }, [vehicleUtilDateRange, vehicleUtilDate, vehicleUtilEndDate])

  // Get vehicle reg for filter
  const selectedVehicleReg = useMemo(() => {
    if (!vehicleUtilVehicle) return undefined
    const vehicle = allVehicles?.find(v => v.id === vehicleUtilVehicle)
    return vehicle?.reg_no
  }, [vehicleUtilVehicle, allVehicles])

  // Fetch vehicle utilization data
  const { data: vehicleUtilData, isLoading: vehicleUtilLoading } = useAllBookings({
    dateFrom: vehicleUtilDateFrom,
    dateTo: vehicleUtilDateTo,
    vehicle: selectedVehicleReg || undefined,
    includeYesterdayIncomplete: false,
  })

  // Calculate vehicle utilization metrics
  const vehicleUtilizationMetrics = useMemo(() => {
    if (!vehicleUtilData || vehicleUtilData.length === 0) {
      return null
    }

    // Calculate total days in period
    const startDate = new Date(vehicleUtilDateFrom)
    const endDate = new Date(vehicleUtilDateTo)
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    // Group by vehicle reg (Note: using reg as key - if multiple vehicles have same reg, they'll be grouped together)
    const vehicleMap = new Map<string, {
      vehicleReg: string
      vehicleId: string | null
      trips: TripListItem[]
      activeDays: Set<string>
    }>()

    vehicleUtilData.forEach(trip => {
      if (trip.vehicle_reg) {
        const vehicleKey = trip.vehicle_reg
        if (!vehicleMap.has(vehicleKey)) {
          vehicleMap.set(vehicleKey, {
            vehicleReg: trip.vehicle_reg,
            vehicleId: null, // We don't have vehicle_id in TripListItem
            trips: [],
            activeDays: new Set()
          })
        }
        const vehicleData = vehicleMap.get(vehicleKey)!
        vehicleData.trips.push(trip)
        
        // Track active days (days when vehicle had trips)
        if (trip.start_time) {
          const tripDate = new Date(trip.start_time).toISOString().split('T')[0]
          vehicleData.activeDays.add(tripDate)
        }
      }
    })

    // Get vehicle statuses from allVehicles
    const vehicleStatusMap = new Map<string, string>()
    allVehicles?.forEach(vehicle => {
      vehicleStatusMap.set(vehicle.reg_no, vehicle.status)
    })

    // Calculate metrics for each vehicle
    const metrics = Array.from(vehicleMap.values()).map(vehicle => {
      const trips = vehicle.trips
      const totalTrips = trips.length
      const totalRevenue = trips.reduce((sum, t) => sum + (t.fare || 0), 0)
      const totalKm = trips.reduce((sum, t) => {
        const km = t.actual_km ?? t.est_km ?? 0
        return sum + Number(km)
      }, 0)
      
      const activeDaysCount = vehicle.activeDays.size
      const avgTripsPerDay = activeDaysCount > 0 ? totalTrips / activeDaysCount : 0
      const avgKmPerDay = activeDaysCount > 0 ? totalKm / activeDaysCount : 0
      const utilizationPercentage = totalDays > 0 ? (activeDaysCount / totalDays) * 100 : 0

      // Revenue by trip type
      const revenueByType = {
        subscription: trips.filter(t => t.type === 'subscription').reduce((sum, t) => sum + (t.fare || 0), 0),
        airport: trips.filter(t => t.type === 'airport').reduce((sum, t) => sum + (t.fare || 0), 0),
        rental: trips.filter(t => t.type === 'rental').reduce((sum, t) => sum + (t.fare || 0), 0),
        manual: trips.filter(t => t.type === 'manual').reduce((sum, t) => sum + (t.fare || 0), 0),
      }

      // Driver assignments (unique drivers who used this vehicle)
      const driverSet = new Set<string>()
      trips.forEach(trip => {
        if (trip.driver_name) {
          driverSet.add(trip.driver_name)
        }
      })
      const driverAssignments = Array.from(driverSet).join(', ') || 'None'

      // Get current vehicle status for maintenance/downtime tracking
      const currentStatus = vehicleStatusMap.get(vehicle.vehicleReg) || 'unknown'
      const isInService = currentStatus === 'service' || currentStatus === 'ets'
      const maintenanceStatus = isInService ? currentStatus : 'operational'

      return {
        vehicleReg: vehicle.vehicleReg,
        totalTrips,
        totalRevenue,
        totalKm,
        avgTripsPerDay,
        avgKmPerDay,
        utilizationPercentage,
        activeDaysCount,
        totalDays,
        revenueByType,
        driverAssignments,
        maintenanceStatus,
        currentStatus,
      }
    })

    return metrics.sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
  }, [vehicleUtilData, vehicleUtilDateFrom, vehicleUtilDateTo, allVehicles])

  // Calculate customer analysis date range
  const customerAnalysisDateFrom = useMemo(() => {
    if (customerAnalysisDateRange === 'day') {
      return customerAnalysisDate
    } else if (customerAnalysisDateRange === 'week') {
      return customerAnalysisStartDate
    } else if (customerAnalysisDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    } else {
      return customerAnalysisStartDate
    }
  }, [customerAnalysisDateRange, customerAnalysisDate, customerAnalysisStartDate])

  const customerAnalysisDateTo = useMemo(() => {
    if (customerAnalysisDateRange === 'day') {
      return customerAnalysisDate
    } else if (customerAnalysisDateRange === 'week') {
      return customerAnalysisEndDate
    } else if (customerAnalysisDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    } else {
      return customerAnalysisEndDate
    }
  }, [customerAnalysisDateRange, customerAnalysisDate, customerAnalysisEndDate])

  // Fetch customer analysis data
  const { data: customerAnalysisData, isLoading: customerAnalysisLoading } = useAllBookings({
    dateFrom: customerAnalysisDateFrom,
    dateTo: customerAnalysisDateTo,
    includeYesterdayIncomplete: false,
  })

  // Fetch all bookings for lifetime value calculation (across all time)
  const { data: allTimeBookings } = useAllBookings({
    includeYesterdayIncomplete: false,
  })

  // Fetch payment details for customer analysis
  useEffect(() => {
    if (customerAnalysisData && customerAnalysisData.length > 0) {
      const tripIds = customerAnalysisData.map(trip => trip.id)
      if (tripIds.length > 0) {
        supabase
          .from('payments')
          .select('trip_id, method')
          .in('trip_id', tripIds)
          .eq('status', 'completed')
          .then(({ data, error }) => {
            if (!error && data) {
              const paymentMap: Record<string, { method: string | null }> = {}
              data.forEach((payment: any) => {
                if (payment.trip_id) {
                  const methodMap: Record<string, string> = {
                    'cash': 'Cash',
                    'upi': 'UPI',
                    'others': 'Others',
                  }
                  paymentMap[payment.trip_id] = {
                    method: methodMap[payment.method?.toLowerCase() || ''] || payment.method || null,
                  }
                }
              })
              setCustomerAnalysisPayments(paymentMap)
            } else {
              setCustomerAnalysisPayments({})
            }
          })
      } else {
        setCustomerAnalysisPayments({})
      }
    } else {
      setCustomerAnalysisPayments({})
    }
  }, [customerAnalysisData])

  // Calculate customer analysis metrics
  const customerAnalysisMetrics = useMemo(() => {
    if (!customerAnalysisData || customerAnalysisData.length === 0) {
      return null
    }

    // Calculate total days in period for booking frequency
    const startDate = new Date(customerAnalysisDateFrom)
    const endDate = new Date(customerAnalysisDateTo)
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    // Group by customer (using customer_name and customer_phone as key)
    const customerMap = new Map<string, {
      customerName: string
      customerPhone: string | null
      trips: TripListItem[]
      lastTripDate: string | null
    }>()

    customerAnalysisData.forEach(trip => {
      if (trip.customer_name) {
        // Use name + phone as key to handle customers with same name
        const customerKey = `${trip.customer_name}_${trip.customer_phone || ''}`
        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            customerName: trip.customer_name,
            customerPhone: trip.customer_phone,
            trips: [],
            lastTripDate: null
          })
        }
        const customerData = customerMap.get(customerKey)!
        customerData.trips.push(trip)
        
        // Track last trip date
        if (trip.start_time) {
          const tripDate = trip.start_time
          if (!customerData.lastTripDate || tripDate > customerData.lastTripDate) {
            customerData.lastTripDate = tripDate
          }
        }
      }
    })

    // Calculate lifetime value from all-time bookings
    const lifetimeValueMap = new Map<string, number>()
    allTimeBookings?.forEach(trip => {
      if (trip.customer_name && trip.fare) {
        const customerKey = `${trip.customer_name}_${trip.customer_phone || ''}`
        const currentValue = lifetimeValueMap.get(customerKey) || 0
        lifetimeValueMap.set(customerKey, currentValue + (trip.fare || 0))
      }
    })

    // Calculate metrics for each customer
    const metrics = Array.from(customerMap.values()).map(customer => {
      const trips = customer.trips
      const totalTrips = trips.length
      const totalRevenue = trips.reduce((sum, t) => sum + (t.fare || 0), 0)
      const totalKm = trips.reduce((sum, t) => {
        const km = t.actual_km ?? t.est_km ?? 0
        return sum + Number(km)
      }, 0)
      
      const avgFarePerTrip = totalTrips > 0 ? totalRevenue / totalTrips : 0
      const bookingFrequency = totalDays > 0 ? totalTrips / totalDays : 0

      // Trip type breakdown
      const tripTypeBreakdown = {
        subscription: trips.filter(t => t.type === 'subscription').length,
        airport: trips.filter(t => t.type === 'airport').length,
        rental: trips.filter(t => t.type === 'rental').length,
        manual: trips.filter(t => t.type === 'manual').length,
      }

      // Payment mode preference
      const paymentModeCount = {
        cash: 0,
        upi: 0,
        others: 0,
      }
      trips.forEach(trip => {
        const payment = customerAnalysisPayments[trip.id]
        if (payment?.method) {
          if (payment.method === 'Cash') paymentModeCount.cash += 1
          else if (payment.method === 'UPI') paymentModeCount.upi += 1
          else paymentModeCount.others += 1
        }
      })
      
      // Determine preferred payment mode
      const maxCount = Math.max(paymentModeCount.cash, paymentModeCount.upi, paymentModeCount.others)
      let preferredPaymentMode = 'N/A'
      if (maxCount > 0) {
        if (paymentModeCount.cash === maxCount) preferredPaymentMode = 'Cash'
        else if (paymentModeCount.upi === maxCount) preferredPaymentMode = 'UPI'
        else preferredPaymentMode = 'Others'
      }

      // Customer lifetime value (from all-time bookings)
      const customerKey = `${customer.customerName}_${customer.customerPhone || ''}`
      const lifetimeValue = lifetimeValueMap.get(customerKey) || 0

      return {
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        totalTrips,
        totalRevenue,
        totalKm,
        avgFarePerTrip,
        bookingFrequency,
        tripTypeBreakdown,
        preferredPaymentMode,
        paymentModeCount,
        lastTripDate: customer.lastTripDate,
        lifetimeValue,
      }
    })

    return metrics.sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
  }, [customerAnalysisData, customerAnalysisDateFrom, customerAnalysisDateTo, customerAnalysisPayments, allTimeBookings])

  // Calculate hub performance date range
  const hubPerfDateFrom = useMemo(() => {
    if (hubPerfDateRange === 'day') {
      return hubPerfDate
    } else if (hubPerfDateRange === 'week') {
      return hubPerfStartDate
    } else if (hubPerfDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    } else {
      return hubPerfStartDate
    }
  }, [hubPerfDateRange, hubPerfDate, hubPerfStartDate])

  const hubPerfDateTo = useMemo(() => {
    if (hubPerfDateRange === 'day') {
      return hubPerfDate
    } else if (hubPerfDateRange === 'week') {
      return hubPerfEndDate
    } else if (hubPerfDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    } else {
      return hubPerfEndDate
    }
  }, [hubPerfDateRange, hubPerfDate, hubPerfEndDate])

  // Fetch hub performance data
  const { data: hubPerfData, isLoading: hubPerfLoading } = useAllBookings({
    dateFrom: hubPerfDateFrom,
    dateTo: hubPerfDateTo,
    hub: hubPerfHub || undefined,
    includeYesterdayIncomplete: false,
  })

  // Calculate hub performance metrics
  const hubPerformanceMetrics = useMemo(() => {
    if (!hubPerfData || hubPerfData.length === 0) {
      return null
    }

    // Group by hub name
    const hubMap = new Map<string, {
      hubName: string
      hubId: string | null
      trips: TripListItem[]
      hours: Map<number, number> // hour -> trip count
      days: Map<string, number> // day of week -> trip count
    }>()

    hubPerfData.forEach(trip => {
      if (trip.hub_name) {
        const hubKey = trip.hub_name
        if (!hubMap.has(hubKey)) {
          hubMap.set(hubKey, {
            hubName: trip.hub_name,
            hubId: null, // We don't have hub_id in TripListItem
            trips: [],
            hours: new Map(),
            days: new Map()
          })
        }
        const hubData = hubMap.get(hubKey)!
        hubData.trips.push(trip)
        
        // Track peak hours (0-23)
        if (trip.start_time) {
          const tripDate = new Date(trip.start_time)
          const hour = tripDate.getHours()
          hubData.hours.set(hour, (hubData.hours.get(hour) || 0) + 1)
          
          // Track peak days (0 = Sunday, 1 = Monday, etc.)
          const dayOfWeek = tripDate.getDay()
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          const dayName = dayNames[dayOfWeek]
          hubData.days.set(dayName, (hubData.days.get(dayName) || 0) + 1)
        }
      }
    })

    // Calculate metrics for each hub
    const metrics = Array.from(hubMap.values()).map(hub => {
      const trips = hub.trips
      const totalTrips = trips.length
      const totalRevenue = trips.reduce((sum, t) => sum + (t.fare || 0), 0)
      const totalKm = trips.reduce((sum, t) => {
        const km = t.actual_km ?? t.est_km ?? 0
        return sum + Number(km)
      }, 0)

      // Trip type distribution
      const tripTypeDistribution = {
        subscription: trips.filter(t => t.type === 'subscription').length,
        airport: trips.filter(t => t.type === 'airport').length,
        rental: trips.filter(t => t.type === 'rental').length,
        manual: trips.filter(t => t.type === 'manual').length,
      }

      // Driver/vehicle allocation (unique counts)
      const driverSet = new Set<string>()
      const vehicleSet = new Set<string>()
      trips.forEach(trip => {
        if (trip.driver_name) driverSet.add(trip.driver_name)
        if (trip.vehicle_reg) vehicleSet.add(trip.vehicle_reg)
      })
      const driverCount = driverSet.size
      const vehicleCount = vehicleSet.size
      const driverAllocation = Array.from(driverSet).join(', ') || 'None'
      const vehicleAllocation = Array.from(vehicleSet).join(', ') || 'None'

      // Peak hours (top 3 hours with most trips)
      const hoursArray = Array.from(hub.hours.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
      const peakHours = hoursArray.length > 0 
        ? hoursArray.map(h => `${h.hour}:00 (${h.count} trips)`).join(', ')
        : 'N/A'

      // Peak days (top 3 days with most trips)
      const daysArray = Array.from(hub.days.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
      const peakDays = daysArray.length > 0
        ? daysArray.map(d => `${d.day} (${d.count} trips)`).join(', ')
        : 'N/A'

      return {
        hubName: hub.hubName,
        totalTrips,
        totalRevenue,
        totalKm,
        tripTypeDistribution,
        driverCount,
        vehicleCount,
        driverAllocation,
        vehicleAllocation,
        peakHours,
        peakDays,
      }
    })

    return metrics.sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
  }, [hubPerfData])

  // Calculate revenue analysis date range
  const revenueAnalysisDateFrom = useMemo(() => {
    if (revenueAnalysisDateRange === 'day') {
      return revenueAnalysisDate
    } else if (revenueAnalysisDateRange === 'week') {
      return revenueAnalysisStartDate
    } else if (revenueAnalysisDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    } else {
      return revenueAnalysisStartDate
    }
  }, [revenueAnalysisDateRange, revenueAnalysisDate, revenueAnalysisStartDate])

  const revenueAnalysisDateTo = useMemo(() => {
    if (revenueAnalysisDateRange === 'day') {
      return revenueAnalysisDate
    } else if (revenueAnalysisDateRange === 'week') {
      return revenueAnalysisEndDate
    } else if (revenueAnalysisDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    } else {
      return revenueAnalysisEndDate
    }
  }, [revenueAnalysisDateRange, revenueAnalysisDate, revenueAnalysisEndDate])

  // Fetch revenue analysis data
  const { data: revenueAnalysisData, isLoading: revenueAnalysisLoading } = useAllBookings({
    dateFrom: revenueAnalysisDateFrom,
    dateTo: revenueAnalysisDateTo,
    includeYesterdayIncomplete: false,
  })

  // Fetch payment details for revenue analysis
  useEffect(() => {
    if (revenueAnalysisData && revenueAnalysisData.length > 0) {
      const tripIds = revenueAnalysisData.map(trip => trip.id)
      if (tripIds.length > 0) {
        supabase
          .from('payments')
          .select('trip_id, method')
          .in('trip_id', tripIds)
          .eq('status', 'completed')
          .then(({ data, error }) => {
            if (!error && data) {
              const paymentMap: Record<string, { method: string | null }> = {}
              data.forEach((payment: any) => {
                if (payment.trip_id) {
                  const methodMap: Record<string, string> = {
                    'cash': 'Cash',
                    'upi': 'UPI',
                    'others': 'Others',
                  }
                  paymentMap[payment.trip_id] = {
                    method: methodMap[payment.method?.toLowerCase() || ''] || payment.method || null,
                  }
                }
              })
              setRevenueAnalysisPayments(paymentMap)
            } else {
              setRevenueAnalysisPayments({})
            }
          })
      } else {
        setRevenueAnalysisPayments({})
      }
    } else {
      setRevenueAnalysisPayments({})
    }
  }, [revenueAnalysisData])

  // Calculate revenue analysis metrics
  const revenueAnalysisMetrics = useMemo(() => {
    if (!revenueAnalysisData || revenueAnalysisData.length === 0) {
      return null
    }

    // Revenue by trip type
    const revenueByTripType = {
      subscription: revenueAnalysisData.filter(t => t.type === 'subscription').reduce((sum, t) => sum + (t.fare || 0), 0),
      airport: revenueAnalysisData.filter(t => t.type === 'airport').reduce((sum, t) => sum + (t.fare || 0), 0),
      rental: revenueAnalysisData.filter(t => t.type === 'rental').reduce((sum, t) => sum + (t.fare || 0), 0),
      manual: revenueAnalysisData.filter(t => t.type === 'manual').reduce((sum, t) => sum + (t.fare || 0), 0),
    }

    // Revenue by payment mode
    const revenueByPaymentMode = {
      cash: 0,
      upi: 0,
      others: 0,
    }
    revenueAnalysisData.forEach(trip => {
      const payment = revenueAnalysisPayments[trip.id]
      if (payment?.method && trip.fare) {
        if (payment.method === 'Cash') revenueByPaymentMode.cash += trip.fare
        else if (payment.method === 'UPI') revenueByPaymentMode.upi += trip.fare
        else revenueByPaymentMode.others += trip.fare
      }
    })

    // Revenue by hub
    const revenueByHub = new Map<string, number>()
    revenueAnalysisData.forEach(trip => {
      if (trip.hub_name && trip.fare) {
        const current = revenueByHub.get(trip.hub_name) || 0
        revenueByHub.set(trip.hub_name, current + trip.fare)
      }
    })

    // Revenue by driver
    const revenueByDriver = new Map<string, number>()
    revenueAnalysisData.forEach(trip => {
      if (trip.driver_name && trip.fare) {
        const current = revenueByDriver.get(trip.driver_name) || 0
        revenueByDriver.set(trip.driver_name, current + trip.fare)
      }
    })

    // Revenue trends (daily)
    const dailyRevenueTrend = new Map<string, { revenue: number; trips: number; avgFare: number }>()
    revenueAnalysisData.forEach(trip => {
      if (trip.start_time) {
        const date = new Date(trip.start_time).toISOString().split('T')[0]
        const current = dailyRevenueTrend.get(date) || { revenue: 0, trips: 0, avgFare: 0 }
        current.revenue += trip.fare || 0
        current.trips += 1
        dailyRevenueTrend.set(date, current)
      }
    })
    // Calculate average fare for each day
    dailyRevenueTrend.forEach((value) => {
      value.avgFare = value.trips > 0 ? value.revenue / value.trips : 0
    })

    // Revenue trends (weekly) - group by week
    const weeklyRevenueTrend = new Map<string, { revenue: number; trips: number; avgFare: number }>()
    revenueAnalysisData.forEach(trip => {
      if (trip.start_time) {
        const date = new Date(trip.start_time)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0]
        const current = weeklyRevenueTrend.get(weekKey) || { revenue: 0, trips: 0, avgFare: 0 }
        current.revenue += trip.fare || 0
        current.trips += 1
        weeklyRevenueTrend.set(weekKey, current)
      }
    })
    weeklyRevenueTrend.forEach((value) => {
      value.avgFare = value.trips > 0 ? value.revenue / value.trips : 0
    })

    // Revenue trends (monthly) - group by month
    const monthlyRevenueTrend = new Map<string, { revenue: number; trips: number; avgFare: number }>()
    revenueAnalysisData.forEach(trip => {
      if (trip.start_time) {
        const date = new Date(trip.start_time)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const current = monthlyRevenueTrend.get(monthKey) || { revenue: 0, trips: 0, avgFare: 0 }
        current.revenue += trip.fare || 0
        current.trips += 1
        monthlyRevenueTrend.set(monthKey, current)
      }
    })
    monthlyRevenueTrend.forEach((value) => {
      value.avgFare = value.trips > 0 ? value.revenue / value.trips : 0
    })

    return {
      revenueByTripType,
      revenueByPaymentMode,
      revenueByHub: Array.from(revenueByHub.entries()).map(([hub, revenue]) => ({ hub, revenue })).sort((a, b) => b.revenue - a.revenue),
      revenueByDriver: Array.from(revenueByDriver.entries()).map(([driver, revenue]) => ({ driver, revenue })).sort((a, b) => b.revenue - a.revenue),
      dailyRevenueTrend: Array.from(dailyRevenueTrend.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date)),
      weeklyRevenueTrend: Array.from(weeklyRevenueTrend.entries()).map(([week, data]) => ({ week, ...data })).sort((a, b) => a.week.localeCompare(b.week)),
      monthlyRevenueTrend: Array.from(monthlyRevenueTrend.entries()).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month)),
    }
  }, [revenueAnalysisData, revenueAnalysisPayments])

  // Payment Mode Analysis Report - Date Range
  const paymentModeDateFrom = useMemo(() => {
    if (paymentModeDateRange === 'day') return paymentModeDate
    if (paymentModeDateRange === 'week') return paymentModeStartDate
    if (paymentModeDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    }
    return paymentModeStartDate
  }, [paymentModeDateRange, paymentModeDate, paymentModeStartDate])

  const paymentModeDateTo = useMemo(() => {
    if (paymentModeDateRange === 'day') return paymentModeDate
    if (paymentModeDateRange === 'week') return paymentModeEndDate
    if (paymentModeDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    }
    return paymentModeEndDate
  }, [paymentModeDateRange, paymentModeDate, paymentModeEndDate])

  // Fetch payment mode analysis data
  const { data: paymentModeData, isLoading: paymentModeLoading } = useAllBookings({
    dateFrom: paymentModeDateFrom,
    dateTo: paymentModeDateTo,
    includeYesterdayIncomplete: false,
  })

  // Fetch payment details for payment mode analysis
  useEffect(() => {
    if (paymentModeData && paymentModeData.length > 0) {
      const tripIds = paymentModeData.map(trip => trip.id)
      if (tripIds.length > 0) {
        supabase
          .from('payments')
          .select('trip_id, method, status, amount')
          .in('trip_id', tripIds)
          .then(({ data, error }) => {
            if (!error && data) {
              const paymentMap: Record<string, { method: string | null; status: string | null; amount: number | null }> = {}
              data.forEach((payment: any) => {
                if (payment.trip_id) {
                  const methodMap: Record<string, string> = {
                    'cash': 'Cash',
                    'upi': 'UPI',
                    'others': 'Others',
                  }
                  paymentMap[payment.trip_id] = {
                    method: methodMap[payment.method?.toLowerCase() || ''] || payment.method || null,
                    status: payment.status || null,
                    amount: payment.amount || null,
                  }
                }
              })
              setPaymentModePayments(paymentMap)
            } else {
              setPaymentModePayments({})
            }
          })
      } else {
        setPaymentModePayments({})
      }
    } else {
      setPaymentModePayments({})
    }
  }, [paymentModeData])

  // Peak Hours/Days Report - Date Range
  const peakHoursDateFrom = useMemo(() => {
    if (peakHoursDateRange === 'day') return peakHoursDate
    if (peakHoursDateRange === 'week') return peakHoursStartDate
    if (peakHoursDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    }
    return peakHoursStartDate
  }, [peakHoursDateRange, peakHoursDate, peakHoursStartDate])

  const peakHoursDateTo = useMemo(() => {
    if (peakHoursDateRange === 'day') return peakHoursDate
    if (peakHoursDateRange === 'week') return peakHoursEndDate
    if (peakHoursDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    }
    return peakHoursEndDate
  }, [peakHoursDateRange, peakHoursDate, peakHoursEndDate])

  // Fetch peak hours/days data
  const { data: peakHoursData, isLoading: peakHoursLoading } = useAllBookings({
    dateFrom: peakHoursDateFrom,
    dateTo: peakHoursDateTo,
    includeYesterdayIncomplete: false,
  })

  // Cancellation Report - Date Range
  const cancellationDateFrom = useMemo(() => {
    if (cancellationDateRange === 'day') return cancellationDate
    if (cancellationDateRange === 'week') return cancellationStartDate
    if (cancellationDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    }
    return cancellationStartDate
  }, [cancellationDateRange, cancellationDate, cancellationStartDate])

  const cancellationDateTo = useMemo(() => {
    if (cancellationDateRange === 'day') return cancellationDate
    if (cancellationDateRange === 'week') return cancellationEndDate
    if (cancellationDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    }
    return cancellationEndDate
  }, [cancellationDateRange, cancellationDate, cancellationEndDate])

  // Fetch cancellation data
  const { data: cancellationData, isLoading: cancellationLoading } = useAllBookings({
    dateFrom: cancellationDateFrom,
    dateTo: cancellationDateTo,
    includeYesterdayIncomplete: false,
  })

  // Subscription Performance Report - Date Range
  const subscriptionPerfDateFrom = useMemo(() => {
    if (subscriptionPerfDateRange === 'day') return subscriptionPerfDate
    if (subscriptionPerfDateRange === 'week') return subscriptionPerfStartDate
    if (subscriptionPerfDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    }
    return subscriptionPerfStartDate
  }, [subscriptionPerfDateRange, subscriptionPerfDate, subscriptionPerfStartDate])

  const subscriptionPerfDateTo = useMemo(() => {
    if (subscriptionPerfDateRange === 'day') return subscriptionPerfDate
    if (subscriptionPerfDateRange === 'week') return subscriptionPerfEndDate
    if (subscriptionPerfDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    }
    return subscriptionPerfEndDate
  }, [subscriptionPerfDateRange, subscriptionPerfDate, subscriptionPerfEndDate])

  // Fetch subscription performance data
  const { data: subscriptionPerfData, isLoading: subscriptionPerfLoading } = useAllBookings({
    dateFrom: subscriptionPerfDateFrom,
    dateTo: subscriptionPerfDateTo,
    type: 'subscription',
    includeYesterdayIncomplete: false,
  })

  // Fetch all subscriptions for active count
  const { data: allSubscriptions } = useSubscriptions({ includeInactive: true })

  // Calculate Payment Mode Analysis Metrics
  const paymentModeMetrics = useMemo(() => {
    if (!paymentModeData || paymentModeData.length === 0) {
      return null
    }

    // Revenue by payment mode
    const revenueByMode = { cash: 0, upi: 0, others: 0 }
    // Count by payment mode
    const countByMode = { cash: 0, upi: 0, others: 0 }
    
    paymentModeData.forEach(trip => {
      const payment = paymentModePayments[trip.id]
      if (payment?.method && trip.fare && trip.status === 'completed') {
        if (payment.method === 'Cash') {
          revenueByMode.cash += trip.fare
          countByMode.cash += 1
        } else if (payment.method === 'UPI') {
          revenueByMode.upi += trip.fare
          countByMode.upi += 1
        } else {
          revenueByMode.others += trip.fare
          countByMode.others += 1
        }
      }
    })

    // Payment mode trends (daily)
    const dailyTrend = new Map<string, { cash: number; upi: number; others: number; cashCount: number; upiCount: number; othersCount: number }>()
    paymentModeData.forEach(trip => {
      if (trip.start_time && trip.status === 'completed') {
        const date = new Date(trip.start_time).toISOString().split('T')[0]
        const current = dailyTrend.get(date) || { cash: 0, upi: 0, others: 0, cashCount: 0, upiCount: 0, othersCount: 0 }
        const payment = paymentModePayments[trip.id]
        if (payment?.method && trip.fare) {
          if (payment.method === 'Cash') {
            current.cash += trip.fare
            current.cashCount += 1
          } else if (payment.method === 'UPI') {
            current.upi += trip.fare
            current.upiCount += 1
          } else {
            current.others += trip.fare
            current.othersCount += 1
          }
        }
        dailyTrend.set(date, current)
      }
    })

    // Payment mode by trip type
    const byTripType = {
      subscription: { cash: 0, upi: 0, others: 0, cashCount: 0, upiCount: 0, othersCount: 0 },
      airport: { cash: 0, upi: 0, others: 0, cashCount: 0, upiCount: 0, othersCount: 0 },
      rental: { cash: 0, upi: 0, others: 0, cashCount: 0, upiCount: 0, othersCount: 0 },
      manual: { cash: 0, upi: 0, others: 0, cashCount: 0, upiCount: 0, othersCount: 0 },
    }
    paymentModeData.forEach(trip => {
      if (trip.status === 'completed') {
        const payment = paymentModePayments[trip.id]
        if (payment?.method && trip.fare) {
          const type = trip.type as 'subscription' | 'airport' | 'rental' | 'manual'
          if (payment.method === 'Cash') {
            byTripType[type].cash += trip.fare
            byTripType[type].cashCount += 1
          } else if (payment.method === 'UPI') {
            byTripType[type].upi += trip.fare
            byTripType[type].upiCount += 1
          } else {
            byTripType[type].others += trip.fare
            byTripType[type].othersCount += 1
          }
        }
      }
    })

    // Payment mode by hub
    const byHub = new Map<string, { cash: number; upi: number; others: number; cashCount: number; upiCount: number; othersCount: number }>()
    paymentModeData.forEach(trip => {
      if (trip.hub_name && trip.status === 'completed') {
        const current = byHub.get(trip.hub_name) || { cash: 0, upi: 0, others: 0, cashCount: 0, upiCount: 0, othersCount: 0 }
        const payment = paymentModePayments[trip.id]
        if (payment?.method && trip.fare) {
          if (payment.method === 'Cash') {
            current.cash += trip.fare
            current.cashCount += 1
          } else if (payment.method === 'UPI') {
            current.upi += trip.fare
            current.upiCount += 1
          } else {
            current.others += trip.fare
            current.othersCount += 1
          }
        }
        byHub.set(trip.hub_name, current)
      }
    })

    // Outstanding payments (trips with no payment or pending payment)
    const outstandingTrips = paymentModeData.filter(trip => {
      const payment = paymentModePayments[trip.id]
      return !payment || payment.status !== 'completed'
    })
    const outstandingRevenue = outstandingTrips.reduce((sum, t) => sum + (t.fare || 0), 0)

    return {
      revenueByMode,
      countByMode,
      dailyTrend: Array.from(dailyTrend.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date)),
      byTripType,
      byHub: Array.from(byHub.entries()).map(([hub, data]) => ({ hub, ...data })).sort((a, b) => (b.cash + b.upi + b.others) - (a.cash + a.upi + a.others)),
      outstandingTrips: outstandingTrips.length,
      outstandingRevenue,
    }
  }, [paymentModeData, paymentModePayments])

  // Calculate Peak Hours/Days Metrics
  const peakHoursMetrics = useMemo(() => {
    if (!peakHoursData || peakHoursData.length === 0) {
      return null
    }

    // Trips by hour of day (0-23)
    const tripsByHour = new Map<number, { trips: number; revenue: number }>()
    for (let i = 0; i < 24; i++) {
      tripsByHour.set(i, { trips: 0, revenue: 0 })
    }
    
    // Trips by day of week (0=Sunday, 6=Saturday)
    const tripsByDay = new Map<number, { trips: number; revenue: number }>()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    for (let i = 0; i < 7; i++) {
      tripsByDay.set(i, { trips: 0, revenue: 0 })
    }

    // Busiest routes
    const routeMap = new Map<string, { trips: number; revenue: number }>()
    
    // Driver/vehicle demand patterns
    const driverDemand = new Map<string, number>()
    const vehicleDemand = new Map<string, number>()

    peakHoursData.forEach(trip => {
      if (trip.start_time) {
        const tripDate = new Date(trip.start_time)
        const hour = tripDate.getHours()
        const dayOfWeek = tripDate.getDay()
        
        // Update hour stats
        const hourData = tripsByHour.get(hour)!
        hourData.trips += 1
        hourData.revenue += trip.fare || 0
        tripsByHour.set(hour, hourData)
        
        // Update day stats
        const dayData = tripsByDay.get(dayOfWeek)!
        dayData.trips += 1
        dayData.revenue += trip.fare || 0
        tripsByDay.set(dayOfWeek, dayData)
      }

      // Track routes
      if (trip.route) {
        const current = routeMap.get(trip.route) || { trips: 0, revenue: 0 }
        current.trips += 1
        current.revenue += trip.fare || 0
        routeMap.set(trip.route, current)
      }

      // Track driver/vehicle demand
      if (trip.driver_name) {
        driverDemand.set(trip.driver_name, (driverDemand.get(trip.driver_name) || 0) + 1)
      }
      if (trip.vehicle_reg) {
        vehicleDemand.set(trip.vehicle_reg, (vehicleDemand.get(trip.vehicle_reg) || 0) + 1)
      }
    })

    return {
      tripsByHour: Array.from(tripsByHour.entries()).map(([hour, data]) => ({ hour, ...data })),
      tripsByDay: Array.from(tripsByDay.entries()).map(([day, data]) => ({ day, dayName: dayNames[day], ...data })),
      busiestRoutes: Array.from(routeMap.entries())
        .map(([route, data]) => ({ route, ...data }))
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 20),
      driverDemand: Array.from(driverDemand.entries())
        .map(([driver, count]) => ({ driver, count }))
        .sort((a, b) => b.count - a.count),
      vehicleDemand: Array.from(vehicleDemand.entries())
        .map(([vehicle, count]) => ({ vehicle, count }))
        .sort((a, b) => b.count - a.count),
    }
  }, [peakHoursData])

  // Calculate Cancellation Metrics
  const cancellationMetrics = useMemo(() => {
    if (!cancellationData || cancellationData.length === 0) {
      return null
    }

    const totalTrips = cancellationData.length
    const cancelledTrips = cancellationData.filter(t => t.status === 'cancelled').length
    const cancellationRate = totalTrips > 0 ? (cancelledTrips / totalTrips) * 100 : 0

    // Cancellations by trip type
    const byTripType = {
      subscription: { cancelled: 0 },
      airport: { cancelled: 0 },
      rental: { cancelled: 0 },
      manual: { cancelled: 0 },
    }
    cancellationData.forEach(trip => {
      const type = trip.type as 'subscription' | 'airport' | 'rental' | 'manual'
      if (trip.status === 'cancelled') {
        byTripType[type].cancelled += 1
      }
    })

    // Cancellations by hub
    const byHub = new Map<string, { cancelled: number }>()
    cancellationData.forEach(trip => {
      if (trip.hub_name) {
        const current = byHub.get(trip.hub_name) || { cancelled: 0 }
        if (trip.status === 'cancelled') {
          current.cancelled += 1
        }
        byHub.set(trip.hub_name, current)
      }
    })

    // Cancellations by driver
    const byDriver = new Map<string, { cancelled: number }>()
    cancellationData.forEach(trip => {
      if (trip.driver_name) {
        const current = byDriver.get(trip.driver_name) || { cancelled: 0 }
        if (trip.status === 'cancelled') {
          current.cancelled += 1
        }
        byDriver.set(trip.driver_name, current)
      }
    })

    // Customer cancellation patterns
    const byCustomer = new Map<string, { cancelled: number; customerName: string }>()
    cancellationData.forEach(trip => {
      if (trip.customer_name) {
        const key = `${trip.customer_name}_${trip.customer_phone || ''}`
        const current = byCustomer.get(key) || { cancelled: 0, customerName: trip.customer_name }
        if (trip.status === 'cancelled') {
          current.cancelled += 1
        }
        byCustomer.set(key, current)
      }
    })

    return {
      totalTrips,
      cancelledTrips,
      cancellationRate,
      byTripType,
      byHub: Array.from(byHub.entries()).map(([hub, data]) => ({ hub, ...data })),
      byDriver: Array.from(byDriver.entries()).map(([driver, data]) => ({ driver, ...data })),
      byCustomer: Array.from(byCustomer.values())
        .filter(c => c.cancelled > 0)
        .sort((a, b) => b.cancelled - a.cancelled),
    }
  }, [cancellationData])

  // Calculate Subscription Performance Metrics
  const subscriptionPerfMetrics = useMemo(() => {
    if (!subscriptionPerfData || subscriptionPerfData.length === 0) {
      return null
    }

    const activeSubscriptions = allSubscriptions?.filter(s => s.status === 'active').length || 0
    const totalSubscriptions = allSubscriptions?.length || 0
    const subscriptionRidesCount = subscriptionPerfData.length
    const subscriptionRevenue = subscriptionPerfData.reduce((sum, t) => sum + (t.fare || 0), 0)

    // Calculate utilization rate (rides per active subscription)
    const utilizationRate = activeSubscriptions > 0 ? (subscriptionRidesCount / activeSubscriptions) : 0

    // Customer retention (customers with multiple subscription rides)
    const customerRides = new Map<string, number>()
    subscriptionPerfData.forEach(trip => {
      if (trip.customer_name) {
        const key = `${trip.customer_name}_${trip.customer_phone || ''}`
        customerRides.set(key, (customerRides.get(key) || 0) + 1)
      }
    })
    const retainedCustomers = Array.from(customerRides.values()).filter(count => count > 1).length
    const retentionRate = customerRides.size > 0 ? (retainedCustomers / customerRides.size) * 100 : 0

    // Subscription trends (daily)
    const dailyTrend = new Map<string, { rides: number; revenue: number }>()
    subscriptionPerfData.forEach(trip => {
      if (trip.start_time) {
        const date = new Date(trip.start_time).toISOString().split('T')[0]
        const current = dailyTrend.get(date) || { rides: 0, revenue: 0 }
        current.rides += 1
        current.revenue += trip.fare || 0
        dailyTrend.set(date, current)
      }
    })

    // Subscription trends (weekly)
    const weeklyTrend = new Map<string, { rides: number; revenue: number }>()
    subscriptionPerfData.forEach(trip => {
      if (trip.start_time) {
        const date = new Date(trip.start_time)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekKey = weekStart.toISOString().split('T')[0]
        const current = weeklyTrend.get(weekKey) || { rides: 0, revenue: 0 }
        current.rides += 1
        current.revenue += trip.fare || 0
        weeklyTrend.set(weekKey, current)
      }
    })

    // Subscription trends (monthly)
    const monthlyTrend = new Map<string, { rides: number; revenue: number }>()
    subscriptionPerfData.forEach(trip => {
      if (trip.start_time) {
        const date = new Date(trip.start_time)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const current = monthlyTrend.get(monthKey) || { rides: 0, revenue: 0 }
        current.rides += 1
        current.revenue += trip.fare || 0
        monthlyTrend.set(monthKey, current)
      }
    })

    return {
      activeSubscriptions,
      totalSubscriptions,
      subscriptionRidesCount,
      subscriptionRevenue,
      utilizationRate,
      retainedCustomers,
      retentionRate,
      dailyTrend: Array.from(dailyTrend.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date)),
      weeklyTrend: Array.from(weeklyTrend.entries()).map(([week, data]) => ({ week, ...data })).sort((a, b) => a.week.localeCompare(b.week)),
      monthlyTrend: Array.from(monthlyTrend.entries()).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month)),
    }
  }, [subscriptionPerfData, allSubscriptions])

  // Calculate trip-wise date range based on selection
  const tripWiseDateFrom = useMemo(() => {
    if (tripWiseDateRange === 'day') {
      return tripWiseDate
    } else if (tripWiseDateRange === 'week') {
      return tripWiseStartDate
    } else if (tripWiseDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    } else {
      return tripWiseStartDate
    }
  }, [tripWiseDateRange, tripWiseDate, tripWiseStartDate])

  const tripWiseDateTo = useMemo(() => {
    if (tripWiseDateRange === 'day') {
      return tripWiseDate
    } else if (tripWiseDateRange === 'week') {
      return tripWiseEndDate
    } else if (tripWiseDateRange === 'month') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      return new Date(year, month, 0).toISOString().split('T')[0]
    } else {
      return tripWiseEndDate
    }
  }, [tripWiseDateRange, tripWiseDate, tripWiseEndDate])

  // Fetch trip-wise data
  const { data: tripWiseData, isLoading: tripWiseLoading } = useAllBookings({
    dateFrom: tripWiseDateFrom,
    dateTo: tripWiseDateTo,
    type: tripWiseType || undefined,
    status: tripWiseStatus || undefined,
    hub: tripWiseHub || undefined,
    driver: tripWiseDriver || undefined,
    vehicle: tripWiseVehicle || undefined,
    includeYesterdayIncomplete: false, // Don't show incomplete trips in reports
  })

  // Fetch payment details for trips
  useEffect(() => {
    if (tripWiseData && tripWiseData.length > 0) {
      const tripIds = tripWiseData.map(trip => trip.id)
      if (tripIds.length > 0) {
        supabase
          .from('payments')
          .select('trip_id, method, txn_ref')
          .in('trip_id', tripIds)
          .eq('status', 'completed')
          .then(({ data, error }) => {
            if (!error && data) {
              const paymentMap: Record<string, { method: string | null; comment: string | null }> = {}
              data.forEach((payment: any) => {
                if (payment.trip_id) {
                  const methodMap: Record<string, string> = {
                    'cash': 'Cash',
                    'upi': 'UPI',
                    'others': 'Others',
                  }
                  paymentMap[payment.trip_id] = {
                    method: methodMap[payment.method?.toLowerCase() || ''] || payment.method || null,
                    comment: payment.txn_ref || null,
                  }
                }
              })
              setTripWisePayments(paymentMap)
            } else {
              setTripWisePayments({})
            }
          })
      } else {
        setTripWisePayments({})
      }
    } else {
      setTripWisePayments({})
    }
  }, [tripWiseData])
  
  const { data: dailyData, isLoading: dailyLoading } = useDailySummary(
    dailyDate,
    dailyDate,
    dailyHub || null
  )
  
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklySummary(
    weeklyStartDate,
    weeklyEndDate,
    weeklyHub || null
  )

  // Calculate monthly date range
  const monthlyStartDate = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}-01`
  // Get last day of the selected month
  // monthlyMonth is 1-12 (user input), JavaScript Date months are 0-11
  // new Date(year, month, 0) gives last day of (month-1)
  // Example: monthlyMonth=1 (Jan), we need new Date(2024, 2, 0) = Jan 31, 2024
  // So we use monthlyMonth to get the correct month (monthlyMonth=1 means use month 1 in Date, which gives last day of month 0)
  // Actually, we need monthlyMonth+1: monthlyMonth=1 -> Date(2024, 2, 0) = Jan 31
  const monthlyEndDate = new Date(monthlyYear, monthlyMonth + 1, 0).toISOString().split('T')[0]
  
  const { data: monthlyData, isLoading: monthlyLoading } = useDailySummary(
    monthlyStartDate,
    monthlyEndDate,
    monthlyHub || null
  )

  const { data: customData, isLoading: customLoading } = useDailySummary(
    customStartDate,
    customEndDate,
    customHub || null
  )

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const handleDailyExport = () => {
    if (!dailyData || dailyData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = dailyData.map((row) => ({
      Date: formatDate(row.report_date),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Total KM': (row.total_km || 0).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Subscription KM': (row.subscription_km || 0).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Airport KM': (row.airport_km || 0).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Rental KM': (row.rental_km || 0).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
      'Manual KM': ((row.manual_km || 0)).toFixed(2),
      'Cash Revenue (₹)': ((row.cash_revenue || 0) / 100).toFixed(2),
      'Cash Count': row.cash_count || 0,
      'UPI Revenue (₹)': ((row.upi_revenue || 0) / 100).toFixed(2),
      'UPI Count': row.upi_count || 0,
      'Others Revenue (₹)': ((row.others_revenue || 0) / 100).toFixed(2),
      'Others Count': row.others_count || 0,
    }))

    exportToCSV(exportData, 'daily_report')
  }

  const handleWeeklyExport = () => {
    if (!weeklyData || weeklyData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = weeklyData.map((row) => ({
      'Week Start': formatDate(row.week_start),
      'Week End': formatDate(row.week_end),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Total KM': (row.total_km || 0).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Subscription KM': (row.subscription_km || 0).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Airport KM': (row.airport_km || 0).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Rental KM': (row.rental_km || 0).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
      'Manual KM': ((row.manual_km || 0)).toFixed(2),
      'Cash Revenue (₹)': ((row.cash_revenue || 0) / 100).toFixed(2),
      'Cash Count': row.cash_count || 0,
      'UPI Revenue (₹)': ((row.upi_revenue || 0) / 100).toFixed(2),
      'UPI Count': row.upi_count || 0,
      'Others Revenue (₹)': ((row.others_revenue || 0) / 100).toFixed(2),
      'Others Count': row.others_count || 0,
    }))

    exportToCSV(exportData, 'weekly_report')
  }

  const handleMonthlyExport = () => {
    if (!monthlyData || monthlyData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = monthlyData.map((row) => ({
      Date: formatDate(row.report_date),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Total KM': (row.total_km || 0).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Subscription KM': (row.subscription_km || 0).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Airport KM': (row.airport_km || 0).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Rental KM': (row.rental_km || 0).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
      'Manual KM': ((row.manual_km || 0)).toFixed(2),
      'Cash Revenue (₹)': ((row.cash_revenue || 0) / 100).toFixed(2),
      'Cash Count': row.cash_count || 0,
      'UPI Revenue (₹)': ((row.upi_revenue || 0) / 100).toFixed(2),
      'UPI Count': row.upi_count || 0,
      'Others Revenue (₹)': ((row.others_revenue || 0) / 100).toFixed(2),
      'Others Count': row.others_count || 0,
    }))

    exportToCSV(exportData, `monthly_report_${monthlyYear}_${monthlyMonth}`)
  }

  const handleCustomExport = () => {
    if (!customData || customData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = customData.map((row) => ({
      Date: formatDate(row.report_date),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Total KM': (row.total_km || 0).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Subscription KM': (row.subscription_km || 0).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Airport KM': (row.airport_km || 0).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Rental KM': (row.rental_km || 0).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
      'Manual KM': ((row.manual_km || 0)).toFixed(2),
      'Cash Revenue (₹)': ((row.cash_revenue || 0) / 100).toFixed(2),
      'Cash Count': row.cash_count || 0,
      'UPI Revenue (₹)': ((row.upi_revenue || 0) / 100).toFixed(2),
      'UPI Count': row.upi_count || 0,
      'Others Revenue (₹)': ((row.others_revenue || 0) / 100).toFixed(2),
      'Others Count': row.others_count || 0,
    }))

    exportToCSV(exportData, `custom_report_${customStartDate}_to_${customEndDate}`)
  }

  const handleTripWiseExport = () => {
    if (!tripWiseData || tripWiseData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = tripWiseData.map((trip) => {
      const payment = tripWisePayments[trip.id] || { method: null, comment: null }
      const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
          'subscription': 'Subscription',
          'airport': 'Airport',
          'rental': 'Rental',
          'manual': 'Manual',
        }
        return labels[type] || type
      }

      return {
        'Trip ID': trip.id,
        'Type': getTypeLabel(trip.type),
        'Booking Date': trip.created_at ? formatDate(trip.created_at) : '-',
        'Start Time': trip.start_time ? new Date(trip.start_time).toLocaleString('en-IN') : '-',
        'Status': trip.status,
        'Customer Name': trip.customer_name || '-',
        'Customer Phone': trip.customer_phone || '-',
        'Route': trip.route || '-',
        'Hub': trip.hub_name || '-',
        'Driver': trip.driver_name || '-',
        'Vehicle': trip.vehicle_reg || '-',
        'Fare (₹)': trip.fare ? (trip.fare / 100).toFixed(2) : '-',
        'Payment Mode': payment.method || '-',
        'Payment Comment': payment.comment || '-',
        'Est KM': trip.est_km ? trip.est_km.toFixed(2) : '-',
        'Actual KM': trip.actual_km ? trip.actual_km.toFixed(2) : '-',
      }
    })

    const dateRangeLabel = tripWiseDateRange === 'day' 
      ? tripWiseDate 
      : tripWiseDateRange === 'week'
      ? `${tripWiseStartDate}_to_${tripWiseEndDate}`
      : tripWiseDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${tripWiseStartDate}_to_${tripWiseEndDate}`

    exportToCSV(exportData, `trip_wise_report_${dateRangeLabel}`)
  }

  const handleDriverPerfExport = () => {
    if (!driverPerformanceMetrics || driverPerformanceMetrics.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = driverPerformanceMetrics.map((driver) => ({
      'Driver Name': driver.driverName,
      'Total Trips': driver.totalTrips,
      'Total Revenue (₹)': (driver.totalRevenue / 100).toFixed(2),
      'Total KM': driver.totalKm.toFixed(2),
      'Avg Fare per Trip (₹)': (driver.avgFarePerTrip / 100).toFixed(2),
      'Avg KM per Trip': driver.avgKmPerTrip.toFixed(2),
      'Completion Rate (%)': driver.completionRate.toFixed(2),
      'Cancellation Rate (%)': driver.cancellationRate.toFixed(2),
      'Subscription Revenue (₹)': (driver.revenueByType.subscription / 100).toFixed(2),
      'Airport Revenue (₹)': (driver.revenueByType.airport / 100).toFixed(2),
      'Rental Revenue (₹)': (driver.revenueByType.rental / 100).toFixed(2),
      'Manual Revenue (₹)': (driver.revenueByType.manual / 100).toFixed(2),
      'Cash Revenue (₹)': (driver.paymentBreakdown.cash / 100).toFixed(2),
      'UPI Revenue (₹)': (driver.paymentBreakdown.upi / 100).toFixed(2),
      'Others Revenue (₹)': (driver.paymentBreakdown.others / 100).toFixed(2),
      'Best Day Date': driver.bestDay ? formatDate(driver.bestDay.date) : '-',
      'Best Day Revenue (₹)': driver.bestDay ? (driver.bestDay.revenue / 100).toFixed(2) : '-',
      'Best Day Trips': driver.bestDay ? driver.bestDay.trips : '-',
      'Worst Day Date': driver.worstDay ? formatDate(driver.worstDay.date) : '-',
      'Worst Day Revenue (₹)': driver.worstDay ? (driver.worstDay.revenue / 100).toFixed(2) : '-',
      'Worst Day Trips': driver.worstDay ? driver.worstDay.trips : '-',
    }))

    const dateRangeLabel = driverPerfDateRange === 'day' 
      ? driverPerfDate 
      : driverPerfDateRange === 'week'
      ? `${driverPerfStartDate}_to_${driverPerfEndDate}`
      : driverPerfDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${driverPerfStartDate}_to_${driverPerfEndDate}`

    exportToCSV(exportData, `driver_performance_report_${dateRangeLabel}`)
  }

  const handleVehicleUtilExport = () => {
    if (!vehicleUtilizationMetrics || vehicleUtilizationMetrics.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = vehicleUtilizationMetrics.map((vehicle) => ({
      'Vehicle Registration': vehicle.vehicleReg,
      'Total Trips': vehicle.totalTrips,
      'Total Revenue (₹)': (vehicle.totalRevenue / 100).toFixed(2),
      'Total KM': vehicle.totalKm.toFixed(2),
      'Avg Trips per Day': vehicle.avgTripsPerDay.toFixed(2),
      'Avg KM per Day': vehicle.avgKmPerDay.toFixed(2),
      'Utilization %': vehicle.utilizationPercentage.toFixed(2),
      'Active Days': vehicle.activeDaysCount,
      'Total Days in Period': vehicle.totalDays,
      'Subscription Revenue (₹)': (vehicle.revenueByType.subscription / 100).toFixed(2),
      'Airport Revenue (₹)': (vehicle.revenueByType.airport / 100).toFixed(2),
      'Rental Revenue (₹)': (vehicle.revenueByType.rental / 100).toFixed(2),
      'Manual Revenue (₹)': (vehicle.revenueByType.manual / 100).toFixed(2),
      'Driver Assignments': vehicle.driverAssignments,
      'Maintenance Status': vehicle.maintenanceStatus,
      'Current Status': vehicle.currentStatus,
    }))

    const dateRangeLabel = vehicleUtilDateRange === 'day' 
      ? vehicleUtilDate 
      : vehicleUtilDateRange === 'week'
      ? `${vehicleUtilStartDate}_to_${vehicleUtilEndDate}`
      : vehicleUtilDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${vehicleUtilStartDate}_to_${vehicleUtilEndDate}`

    exportToCSV(exportData, `vehicle_utilization_report_${dateRangeLabel}`)
  }

  const handleCustomerAnalysisExport = () => {
    if (!customerAnalysisMetrics || customerAnalysisMetrics.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = customerAnalysisMetrics.map((customer) => ({
      'Customer Name': customer.customerName,
      'Customer Phone': customer.customerPhone || '-',
      'Total Trips': customer.totalTrips,
      'Total Revenue (₹)': (customer.totalRevenue / 100).toFixed(2),
      'Total KM': customer.totalKm.toFixed(2),
      'Avg Fare per Trip (₹)': (customer.avgFarePerTrip / 100).toFixed(2),
      'Booking Frequency (trips/day)': customer.bookingFrequency.toFixed(2),
      'Subscription Trips': customer.tripTypeBreakdown.subscription,
      'Airport Trips': customer.tripTypeBreakdown.airport,
      'Rental Trips': customer.tripTypeBreakdown.rental,
      'Manual Trips': customer.tripTypeBreakdown.manual,
      'Preferred Payment Mode': customer.preferredPaymentMode,
      'Cash Payments': customer.paymentModeCount.cash,
      'UPI Payments': customer.paymentModeCount.upi,
      'Others Payments': customer.paymentModeCount.others,
      'Last Trip Date': customer.lastTripDate ? formatDate(customer.lastTripDate) : '-',
      'Customer Lifetime Value (₹)': (customer.lifetimeValue / 100).toFixed(2),
    }))

    const dateRangeLabel = customerAnalysisDateRange === 'day' 
      ? customerAnalysisDate 
      : customerAnalysisDateRange === 'week'
      ? `${customerAnalysisStartDate}_to_${customerAnalysisEndDate}`
      : customerAnalysisDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${customerAnalysisStartDate}_to_${customerAnalysisEndDate}`

    exportToCSV(exportData, `customer_analysis_report_${dateRangeLabel}`)
  }

  const handleHubPerfExport = () => {
    if (!hubPerformanceMetrics || hubPerformanceMetrics.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = hubPerformanceMetrics.map((hub) => ({
      'Hub Name': hub.hubName,
      'Total Trips': hub.totalTrips,
      'Total Revenue (₹)': (hub.totalRevenue / 100).toFixed(2),
      'Total KM': hub.totalKm.toFixed(2),
      'Subscription Trips': hub.tripTypeDistribution.subscription,
      'Airport Trips': hub.tripTypeDistribution.airport,
      'Rental Trips': hub.tripTypeDistribution.rental,
      'Manual Trips': hub.tripTypeDistribution.manual,
      'Driver Count': hub.driverCount,
      'Vehicle Count': hub.vehicleCount,
      'Driver Allocation': hub.driverAllocation,
      'Vehicle Allocation': hub.vehicleAllocation,
      'Peak Hours': hub.peakHours,
      'Peak Days': hub.peakDays,
    }))

    const dateRangeLabel = hubPerfDateRange === 'day' 
      ? hubPerfDate 
      : hubPerfDateRange === 'week'
      ? `${hubPerfStartDate}_to_${hubPerfEndDate}`
      : hubPerfDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${hubPerfStartDate}_to_${hubPerfEndDate}`

    exportToCSV(exportData, `hub_performance_report_${dateRangeLabel}`)
  }

  const handleRevenueAnalysisExport = () => {
    if (!revenueAnalysisMetrics) {
      alert('No data to export')
      return
    }

    // Combine all revenue breakdowns into a single export with consistent column structure
    const exportData: any[] = []

    // Define all possible columns
    const allColumns = [
      'Category',
      'Name/Date/Period',
      'Subscription Revenue (₹)',
      'Airport Revenue (₹)',
      'Rental Revenue (₹)',
      'Manual Revenue (₹)',
      'Cash Revenue (₹)',
      'UPI Revenue (₹)',
      'Others Revenue (₹)',
      'Total Revenue (₹)',
      'Trips',
      'Avg Fare (₹)'
    ]

    // Revenue by trip type
    const tripTypeTotal = revenueAnalysisMetrics.revenueByTripType.subscription + 
                         revenueAnalysisMetrics.revenueByTripType.airport + 
                         revenueAnalysisMetrics.revenueByTripType.rental + 
                         revenueAnalysisMetrics.revenueByTripType.manual
    exportData.push({
      'Category': 'Revenue by Trip Type',
      'Name/Date/Period': 'Total',
      'Subscription Revenue (₹)': (revenueAnalysisMetrics.revenueByTripType.subscription / 100).toFixed(2),
      'Airport Revenue (₹)': (revenueAnalysisMetrics.revenueByTripType.airport / 100).toFixed(2),
      'Rental Revenue (₹)': (revenueAnalysisMetrics.revenueByTripType.rental / 100).toFixed(2),
      'Manual Revenue (₹)': (revenueAnalysisMetrics.revenueByTripType.manual / 100).toFixed(2),
      'Cash Revenue (₹)': '',
      'UPI Revenue (₹)': '',
      'Others Revenue (₹)': '',
      'Total Revenue (₹)': (tripTypeTotal / 100).toFixed(2),
      'Trips': '',
      'Avg Fare (₹)': '',
    })

    // Revenue by payment mode
    const paymentModeTotal = revenueAnalysisMetrics.revenueByPaymentMode.cash + 
                             revenueAnalysisMetrics.revenueByPaymentMode.upi + 
                             revenueAnalysisMetrics.revenueByPaymentMode.others
    exportData.push({
      'Category': 'Revenue by Payment Mode',
      'Name/Date/Period': 'Total',
      'Subscription Revenue (₹)': '',
      'Airport Revenue (₹)': '',
      'Rental Revenue (₹)': '',
      'Manual Revenue (₹)': '',
      'Cash Revenue (₹)': (revenueAnalysisMetrics.revenueByPaymentMode.cash / 100).toFixed(2),
      'UPI Revenue (₹)': (revenueAnalysisMetrics.revenueByPaymentMode.upi / 100).toFixed(2),
      'Others Revenue (₹)': (revenueAnalysisMetrics.revenueByPaymentMode.others / 100).toFixed(2),
      'Total Revenue (₹)': (paymentModeTotal / 100).toFixed(2),
      'Trips': '',
      'Avg Fare (₹)': '',
    })

    // Revenue by hub
    revenueAnalysisMetrics.revenueByHub.forEach((hub) => {
      exportData.push({
        'Category': 'Revenue by Hub',
        'Name/Date/Period': hub.hub,
        'Subscription Revenue (₹)': '',
        'Airport Revenue (₹)': '',
        'Rental Revenue (₹)': '',
        'Manual Revenue (₹)': '',
        'Cash Revenue (₹)': '',
        'UPI Revenue (₹)': '',
        'Others Revenue (₹)': '',
        'Total Revenue (₹)': (hub.revenue / 100).toFixed(2),
        'Trips': '',
        'Avg Fare (₹)': '',
      })
    })

    // Revenue by driver
    revenueAnalysisMetrics.revenueByDriver.forEach((driver) => {
      exportData.push({
        'Category': 'Revenue by Driver',
        'Name/Date/Period': driver.driver,
        'Subscription Revenue (₹)': '',
        'Airport Revenue (₹)': '',
        'Rental Revenue (₹)': '',
        'Manual Revenue (₹)': '',
        'Cash Revenue (₹)': '',
        'UPI Revenue (₹)': '',
        'Others Revenue (₹)': '',
        'Total Revenue (₹)': (driver.revenue / 100).toFixed(2),
        'Trips': '',
        'Avg Fare (₹)': '',
      })
    })

    // Revenue trends - daily
    revenueAnalysisMetrics.dailyRevenueTrend.forEach((trend) => {
      exportData.push({
        'Category': 'Daily Revenue Trend',
        'Name/Date/Period': formatDate(trend.date),
        'Subscription Revenue (₹)': '',
        'Airport Revenue (₹)': '',
        'Rental Revenue (₹)': '',
        'Manual Revenue (₹)': '',
        'Cash Revenue (₹)': '',
        'UPI Revenue (₹)': '',
        'Others Revenue (₹)': '',
        'Total Revenue (₹)': (trend.revenue / 100).toFixed(2),
        'Trips': trend.trips,
        'Avg Fare (₹)': (trend.avgFare / 100).toFixed(2),
      })
    })

    // Revenue trends - weekly
    revenueAnalysisMetrics.weeklyRevenueTrend.forEach((trend) => {
      exportData.push({
        'Category': 'Weekly Revenue Trend',
        'Name/Date/Period': formatDate(trend.week),
        'Subscription Revenue (₹)': '',
        'Airport Revenue (₹)': '',
        'Rental Revenue (₹)': '',
        'Manual Revenue (₹)': '',
        'Cash Revenue (₹)': '',
        'UPI Revenue (₹)': '',
        'Others Revenue (₹)': '',
        'Total Revenue (₹)': (trend.revenue / 100).toFixed(2),
        'Trips': trend.trips,
        'Avg Fare (₹)': (trend.avgFare / 100).toFixed(2),
      })
    })

    // Revenue trends - monthly
    revenueAnalysisMetrics.monthlyRevenueTrend.forEach((trend) => {
      exportData.push({
        'Category': 'Monthly Revenue Trend',
        'Name/Date/Period': trend.month,
        'Subscription Revenue (₹)': '',
        'Airport Revenue (₹)': '',
        'Rental Revenue (₹)': '',
        'Manual Revenue (₹)': '',
        'Cash Revenue (₹)': '',
        'UPI Revenue (₹)': '',
        'Others Revenue (₹)': '',
        'Total Revenue (₹)': (trend.revenue / 100).toFixed(2),
        'Trips': trend.trips,
        'Avg Fare (₹)': (trend.avgFare / 100).toFixed(2),
      })
    })

    const dateRangeLabel = revenueAnalysisDateRange === 'day' 
      ? revenueAnalysisDate 
      : revenueAnalysisDateRange === 'week'
      ? `${revenueAnalysisStartDate}_to_${revenueAnalysisEndDate}`
      : revenueAnalysisDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${revenueAnalysisStartDate}_to_${revenueAnalysisEndDate}`

    exportToCSV(exportData, `revenue_analysis_report_${dateRangeLabel}`, allColumns)
  }

  const handlePaymentModeExport = () => {
    if (!paymentModeMetrics) {
      alert('No data to export')
      return
    }

    const exportData: any[] = []
    const allColumns = [
      'Category',
      'Payment Mode/Date/Hub/Trip Type',
      'Cash Revenue (₹)',
      'UPI Revenue (₹)',
      'Others Revenue (₹)',
      'Cash Count',
      'UPI Count',
      'Others Count',
      'Total Revenue (₹)',
      'Total Count'
    ]

    // Revenue by payment mode
    exportData.push({
      'Category': 'Revenue by Payment Mode',
      'Payment Mode/Date/Hub/Trip Type': 'Total',
      'Cash Revenue (₹)': (paymentModeMetrics.revenueByMode.cash / 100).toFixed(2),
      'UPI Revenue (₹)': (paymentModeMetrics.revenueByMode.upi / 100).toFixed(2),
      'Others Revenue (₹)': (paymentModeMetrics.revenueByMode.others / 100).toFixed(2),
      'Cash Count': paymentModeMetrics.countByMode.cash,
      'UPI Count': paymentModeMetrics.countByMode.upi,
      'Others Count': paymentModeMetrics.countByMode.others,
      'Total Revenue (₹)': ((paymentModeMetrics.revenueByMode.cash + paymentModeMetrics.revenueByMode.upi + paymentModeMetrics.revenueByMode.others) / 100).toFixed(2),
      'Total Count': paymentModeMetrics.countByMode.cash + paymentModeMetrics.countByMode.upi + paymentModeMetrics.countByMode.others,
    })

    // Payment mode trends
    paymentModeMetrics.dailyTrend.forEach((trend) => {
      exportData.push({
        'Category': 'Payment Mode Trend',
        'Payment Mode/Date/Hub/Trip Type': formatDate(trend.date),
        'Cash Revenue (₹)': (trend.cash / 100).toFixed(2),
        'UPI Revenue (₹)': (trend.upi / 100).toFixed(2),
        'Others Revenue (₹)': (trend.others / 100).toFixed(2),
        'Cash Count': trend.cashCount,
        'UPI Count': trend.upiCount,
        'Others Count': trend.othersCount,
        'Total Revenue (₹)': ((trend.cash + trend.upi + trend.others) / 100).toFixed(2),
        'Total Count': trend.cashCount + trend.upiCount + trend.othersCount,
      })
    })

    // Payment mode by trip type
    Object.entries(paymentModeMetrics.byTripType).forEach(([type, data]) => {
      exportData.push({
        'Category': 'Payment Mode by Trip Type',
        'Payment Mode/Date/Hub/Trip Type': type,
        'Cash Revenue (₹)': (data.cash / 100).toFixed(2),
        'UPI Revenue (₹)': (data.upi / 100).toFixed(2),
        'Others Revenue (₹)': (data.others / 100).toFixed(2),
        'Cash Count': data.cashCount,
        'UPI Count': data.upiCount,
        'Others Count': data.othersCount,
        'Total Revenue (₹)': ((data.cash + data.upi + data.others) / 100).toFixed(2),
        'Total Count': data.cashCount + data.upiCount + data.othersCount,
      })
    })

    // Payment mode by hub
    paymentModeMetrics.byHub.forEach((hub) => {
      exportData.push({
        'Category': 'Payment Mode by Hub',
        'Payment Mode/Date/Hub/Trip Type': hub.hub,
        'Cash Revenue (₹)': (hub.cash / 100).toFixed(2),
        'UPI Revenue (₹)': (hub.upi / 100).toFixed(2),
        'Others Revenue (₹)': (hub.others / 100).toFixed(2),
        'Cash Count': hub.cashCount,
        'UPI Count': hub.upiCount,
        'Others Count': hub.othersCount,
        'Total Revenue (₹)': ((hub.cash + hub.upi + hub.others) / 100).toFixed(2),
        'Total Count': hub.cashCount + hub.upiCount + hub.othersCount,
      })
    })

    // Outstanding payments
    exportData.push({
      'Category': 'Outstanding Payments',
      'Payment Mode/Date/Hub/Trip Type': 'Total',
      'Cash Revenue (₹)': '',
      'UPI Revenue (₹)': '',
      'Others Revenue (₹)': '',
      'Cash Count': '',
      'UPI Count': '',
      'Others Count': '',
      'Total Revenue (₹)': (paymentModeMetrics.outstandingRevenue / 100).toFixed(2),
      'Total Count': paymentModeMetrics.outstandingTrips,
    })

    const dateRangeLabel = paymentModeDateRange === 'day' 
      ? paymentModeDate 
      : paymentModeDateRange === 'week'
      ? `${paymentModeStartDate}_to_${paymentModeEndDate}`
      : paymentModeDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${paymentModeStartDate}_to_${paymentModeEndDate}`

    exportToCSV(exportData, `payment_mode_analysis_report_${dateRangeLabel}`, allColumns)
  }

  const handlePeakHoursExport = () => {
    if (!peakHoursMetrics) {
      alert('No data to export')
      return
    }

    const exportData: any[] = []
    const allColumns = [
      'Category',
      'Hour/Day/Route/Driver/Vehicle',
      'Trips',
      'Revenue (₹)'
    ]

    // Trips by hour
    peakHoursMetrics.tripsByHour.forEach((hour) => {
      exportData.push({
        'Category': 'Trips by Hour',
        'Hour/Day/Route/Driver/Vehicle': `${hour.hour}:00`,
        'Trips': hour.trips,
        'Revenue (₹)': (hour.revenue / 100).toFixed(2),
      })
    })

    // Trips by day
    peakHoursMetrics.tripsByDay.forEach((day) => {
      exportData.push({
        'Category': 'Trips by Day',
        'Hour/Day/Route/Driver/Vehicle': day.dayName,
        'Trips': day.trips,
        'Revenue (₹)': (day.revenue / 100).toFixed(2),
      })
    })

    // Busiest routes
    peakHoursMetrics.busiestRoutes.forEach((route) => {
      exportData.push({
        'Category': 'Busiest Routes',
        'Hour/Day/Route/Driver/Vehicle': route.route,
        'Trips': route.trips,
        'Revenue (₹)': (route.revenue / 100).toFixed(2),
      })
    })

    // Driver demand
    peakHoursMetrics.driverDemand.forEach((driver) => {
      exportData.push({
        'Category': 'Driver Demand',
        'Hour/Day/Route/Driver/Vehicle': driver.driver,
        'Trips': driver.count,
        'Revenue (₹)': '',
      })
    })

    // Vehicle demand
    peakHoursMetrics.vehicleDemand.forEach((vehicle) => {
      exportData.push({
        'Category': 'Vehicle Demand',
        'Hour/Day/Route/Driver/Vehicle': vehicle.vehicle,
        'Trips': vehicle.count,
        'Revenue (₹)': '',
      })
    })

    const dateRangeLabel = peakHoursDateRange === 'day' 
      ? peakHoursDate 
      : peakHoursDateRange === 'week'
      ? `${peakHoursStartDate}_to_${peakHoursEndDate}`
      : peakHoursDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${peakHoursStartDate}_to_${peakHoursEndDate}`

    exportToCSV(exportData, `peak_hours_days_report_${dateRangeLabel}`, allColumns)
  }

  const handleCancellationExport = () => {
    if (!cancellationMetrics) {
      alert('No data to export')
      return
    }

    const exportData: any[] = []
    const allColumns = [
      'Category',
      'Trip Type/Hub/Driver/Customer',
      'Cancelled',
      'Total',
      'Cancellation Rate (%)'
    ]

    // Summary
    exportData.push({
      'Category': 'Summary',
      'Trip Type/Hub/Driver/Customer': 'Total',
      'Cancelled': cancellationMetrics.cancelledTrips,
      'Total': cancellationMetrics.totalTrips,
      'Cancellation Rate (%)': cancellationMetrics.cancellationRate.toFixed(2),
    })

    // By trip type
    Object.entries(cancellationMetrics.byTripType).forEach(([type, data]) => {
      exportData.push({
        'Category': 'By Trip Type',
        'Trip Type/Hub/Driver/Customer': type,
        'Cancelled': data.cancelled,
        'Total': data.cancelled,
        'Cancellation Rate (%)': '',
      })
    })

    // By hub
    cancellationMetrics.byHub.forEach((hub) => {
      exportData.push({
        'Category': 'By Hub',
        'Trip Type/Hub/Driver/Customer': hub.hub,
        'Cancelled': hub.cancelled,
        'Total': hub.cancelled,
        'Cancellation Rate (%)': '',
      })
    })

    // By driver
    cancellationMetrics.byDriver.forEach((driver) => {
      exportData.push({
        'Category': 'By Driver',
        'Trip Type/Hub/Driver/Customer': driver.driver,
        'Cancelled': driver.cancelled,
        'Total': driver.cancelled,
        'Cancellation Rate (%)': '',
      })
    })

    // By customer
    cancellationMetrics.byCustomer.forEach((customer) => {
      exportData.push({
        'Category': 'By Customer',
        'Trip Type/Hub/Driver/Customer': customer.customerName,
        'Cancelled': customer.cancelled,
        'Total': customer.cancelled,
        'Cancellation Rate (%)': '',
      })
    })

    const dateRangeLabel = cancellationDateRange === 'day' 
      ? cancellationDate 
      : cancellationDateRange === 'week'
      ? `${cancellationStartDate}_to_${cancellationEndDate}`
      : cancellationDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${cancellationStartDate}_to_${cancellationEndDate}`

    exportToCSV(exportData, `cancellation_report_${dateRangeLabel}`, allColumns)
  }

  const handleSubscriptionPerfExport = () => {
    if (!subscriptionPerfMetrics) {
      alert('No data to export')
      return
    }

    const exportData: any[] = []
    const allColumns = [
      'Category',
      'Date/Period',
      'Active Subscriptions',
      'Total Subscriptions',
      'Rides Count',
      'Revenue (₹)',
      'Utilization Rate',
      'Retained Customers',
      'Retention Rate (%)'
    ]

    // Summary
    exportData.push({
      'Category': 'Summary',
      'Date/Period': 'Total',
      'Active Subscriptions': subscriptionPerfMetrics.activeSubscriptions,
      'Total Subscriptions': subscriptionPerfMetrics.totalSubscriptions,
      'Rides Count': subscriptionPerfMetrics.subscriptionRidesCount,
      'Revenue (₹)': (subscriptionPerfMetrics.subscriptionRevenue / 100).toFixed(2),
      'Utilization Rate': subscriptionPerfMetrics.utilizationRate.toFixed(2),
      'Retained Customers': subscriptionPerfMetrics.retainedCustomers,
      'Retention Rate (%)': subscriptionPerfMetrics.retentionRate.toFixed(2),
    })

    // Daily trends
    subscriptionPerfMetrics.dailyTrend.forEach((trend) => {
      exportData.push({
        'Category': 'Daily Trend',
        'Date/Period': formatDate(trend.date),
        'Active Subscriptions': '',
        'Total Subscriptions': '',
        'Rides Count': trend.rides,
        'Revenue (₹)': (trend.revenue / 100).toFixed(2),
        'Utilization Rate': '',
        'Retained Customers': '',
        'Retention Rate (%)': '',
      })
    })

    // Weekly trends
    subscriptionPerfMetrics.weeklyTrend.forEach((trend) => {
      exportData.push({
        'Category': 'Weekly Trend',
        'Date/Period': formatDate(trend.week),
        'Active Subscriptions': '',
        'Total Subscriptions': '',
        'Rides Count': trend.rides,
        'Revenue (₹)': (trend.revenue / 100).toFixed(2),
        'Utilization Rate': '',
        'Retained Customers': '',
        'Retention Rate (%)': '',
      })
    })

    // Monthly trends
    subscriptionPerfMetrics.monthlyTrend.forEach((trend) => {
      exportData.push({
        'Category': 'Monthly Trend',
        'Date/Period': trend.month,
        'Active Subscriptions': '',
        'Total Subscriptions': '',
        'Rides Count': trend.rides,
        'Revenue (₹)': (trend.revenue / 100).toFixed(2),
        'Utilization Rate': '',
        'Retained Customers': '',
        'Retention Rate (%)': '',
      })
    })

    const dateRangeLabel = subscriptionPerfDateRange === 'day' 
      ? subscriptionPerfDate 
      : subscriptionPerfDateRange === 'week'
      ? `${subscriptionPerfStartDate}_to_${subscriptionPerfEndDate}`
      : subscriptionPerfDateRange === 'month'
      ? `${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      : `${subscriptionPerfStartDate}_to_${subscriptionPerfEndDate}`

    exportToCSV(exportData, `subscription_performance_report_${dateRangeLabel}`, allColumns)
  }

  const dailyTotals = dailyData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  const weeklyTotals = weeklyData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  const monthlyTotals = monthlyData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  const customTotals = customData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Reports</h1>
        <p className="text-gray-600 mt-1">Daily, weekly, monthly, and custom summaries</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="grid grid-cols-7 gap-2">
          <button
            onClick={() => setActiveTab(0)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 0
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 1
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Weekly Report
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 2
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Monthly Report
          </button>
          <button
            onClick={() => setActiveTab(3)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 3
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Custom Report
          </button>
          <button
            onClick={() => setActiveTab(4)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 4
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Trip-wise Report
          </button>
          <button
            onClick={() => setActiveTab(5)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 5
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Driver Performance
          </button>
          <button
            onClick={() => setActiveTab(6)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 6
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Vehicle Utilization
          </button>
          <button
            onClick={() => setActiveTab(7)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 7
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Customer Analysis
          </button>
          <button
            onClick={() => setActiveTab(8)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 8
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Hub Performance
          </button>
          <button
            onClick={() => setActiveTab(9)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 9
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Revenue Analysis
          </button>
          <button
            onClick={() => setActiveTab(10)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 10
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Payment Mode Analysis
          </button>
          <button
            onClick={() => setActiveTab(11)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 11
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Peak Hours/Days
          </button>
          <button
            onClick={() => setActiveTab(12)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 12
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Cancellation & No-Show
          </button>
          <button
            onClick={() => setActiveTab(13)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 13
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            Subscription Performance
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 0 && (
        <div>
            <div className="space-y-6">
              {/* Inputs */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                    <select
                      value={dailyHub}
                      onChange={(e) => setDailyHub(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">All Hubs</option>
                      {hubs?.map((hub) => (
                        <option key={hub.id} value={hub.id}>
                          {hub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleDailyExport}
                      disabled={!dailyData || dailyData.length === 0}
                      className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Daily Report Table */}
              {dailyLoading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : dailyData && dailyData.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Rides
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Revenue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subscription
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Airport
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rental
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Manual Ride
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyData.map((row) => (
                          <tr key={row.report_date}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(row.report_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {row.total_rides}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(row.total_revenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.subscription_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.airport_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.rental_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.manual_count || 0} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {dailyTotals.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(dailyTotals.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.manual_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.manual_revenue)}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No data available for selected date</p>
                </div>
              )}
            </div>
        </div>
      )}

      {activeTab === 1 && (
        <div>
            <div className="space-y-6">
              {/* Inputs */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={weeklyStartDate}
                      onChange={(e) => setWeeklyStartDate(e.target.value)}
                      max={weeklyEndDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={weeklyEndDate}
                      onChange={(e) => setWeeklyEndDate(e.target.value)}
                      min={weeklyStartDate}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                    <select
                      value={weeklyHub}
                      onChange={(e) => setWeeklyHub(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">All Hubs</option>
                      {hubs?.map((hub) => (
                        <option key={hub.id} value={hub.id}>
                          {hub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleWeeklyExport}
                      disabled={!weeklyData || weeklyData.length === 0}
                      className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekly Report Table */}
              {weeklyLoading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : weeklyData && weeklyData.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Week Start
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Week End
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Rides
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Revenue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subscription
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Airport
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rental
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Manual Ride
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {weeklyData.map((row, index) => (
                          <tr key={`${row.week_start}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(row.week_start)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(row.week_end)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {row.total_rides}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(row.total_revenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.subscription_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.airport_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.rental_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.manual_count || 0} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {weeklyTotals.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(weeklyTotals.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.manual_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.manual_revenue)}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No data available for selected date range</p>
                </div>
              )}
            </div>
        </div>
      )}

      {activeTab === 2 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={monthlyYear}
                    onChange={(e) => setMonthlyYear(parseInt(e.target.value) || new Date().getFullYear())}
                    min="2020"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                  <select
                    value={monthlyHub}
                    onChange={(e) => setMonthlyHub(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Hubs</option>
                    {hubs?.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleMonthlyExport}
                    disabled={!monthlyData || monthlyData.length === 0}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Monthly Report Table */}
            {monthlyLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : monthlyData && monthlyData.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Rides
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Revenue
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subscription
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airport
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rental
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manual Ride
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyData.map((row) => (
                        <tr key={row.report_date}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(row.report_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {row.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(row.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.manual_count || 0} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {monthlyTotals.total_rides}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(monthlyTotals.total_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.subscription_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.subscription_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.airport_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.airport_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.rental_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.rental_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.manual_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.manual_revenue)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No data available for selected month</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                  <select
                    value={customHub}
                    onChange={(e) => setCustomHub(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Hubs</option>
                    {hubs?.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCustomExport}
                    disabled={!customData || customData.length === 0}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Report Table */}
            {customLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : customData && customData.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Rides
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Revenue
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subscription
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airport
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rental
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manual Ride
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customData.map((row) => (
                        <tr key={row.report_date}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(row.report_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {row.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(row.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.manual_count || 0} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {customTotals.total_rides}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(customTotals.total_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.subscription_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.subscription_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.airport_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.airport_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.rental_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.rental_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.manual_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.manual_revenue)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No data available for selected date range</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={tripWiseDateRange}
                    onChange={(e) => setTripWiseDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {tripWiseDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={tripWiseDate}
                      onChange={(e) => setTripWiseDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {tripWiseDateRange === 'week' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={tripWiseStartDate}
                        onChange={(e) => setTripWiseStartDate(e.target.value)}
                        max={tripWiseEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={tripWiseEndDate}
                        onChange={(e) => setTripWiseEndDate(e.target.value)}
                        min={tripWiseStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
                {tripWiseDateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={tripWiseStartDate}
                        onChange={(e) => setTripWiseStartDate(e.target.value)}
                        max={tripWiseEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={tripWiseEndDate}
                        onChange={(e) => setTripWiseEndDate(e.target.value)}
                        min={tripWiseStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trip Type</label>
                  <select
                    value={tripWiseType}
                    onChange={(e) => setTripWiseType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Types</option>
                    <option value="subscription">Subscription</option>
                    <option value="airport">Airport</option>
                    <option value="rental">Rental</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={tripWiseStatus}
                    onChange={(e) => setTripWiseStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="created">Created</option>
                    <option value="assigned">Assigned</option>
                    <option value="enroute">Enroute</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hub</label>
                  <select
                    value={tripWiseHub}
                    onChange={(e) => setTripWiseHub(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Hubs</option>
                    {hubs?.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
                  <select
                    value={tripWiseDriver}
                    onChange={(e) => setTripWiseDriver(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Drivers</option>
                    {allDrivers?.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
                  <select
                    value={tripWiseVehicle}
                    onChange={(e) => setTripWiseVehicle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Vehicles</option>
                    {allVehicles?.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.reg_no}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleTripWiseExport}
                  disabled={!tripWiseData || tripWiseData.length === 0}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Trip-wise Report Table */}
            {tripWiseLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : tripWiseData && tripWiseData.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fare</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est KM</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual KM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tripWiseData.map((trip) => {
                        const payment = tripWisePayments[trip.id] || { method: null, comment: null }
                        const getTypeLabel = (type: string) => {
                          const labels: Record<string, string> = {
                            'subscription': 'Subscription',
                            'airport': 'Airport',
                            'rental': 'Rental',
                            'manual': 'Manual',
                          }
                          return labels[type] || type
                        }
                        return (
                          <tr key={trip.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono text-xs">{trip.id.substring(0, 8)}...</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{getTypeLabel(trip.type)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.created_at ? formatDate(trip.created_at) : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.start_time ? new Date(trip.start_time).toLocaleString('en-IN') : '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                trip.status === 'enroute' ? 'bg-blue-100 text-blue-800' :
                                trip.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                                trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {trip.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{trip.customer_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.customer_phone || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.route || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.hub_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.driver_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.vehicle_reg || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{trip.fare ? formatCurrency(trip.fare) : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{payment.method || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.est_km ? trip.est_km.toFixed(2) : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{trip.actual_km ? trip.actual_km.toFixed(2) : '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {tripWiseData.length} trip{tripWiseData.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No trips found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 5 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={driverPerfDateRange}
                    onChange={(e) => setDriverPerfDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {driverPerfDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={driverPerfDate}
                      onChange={(e) => setDriverPerfDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {driverPerfDateRange === 'week' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={driverPerfStartDate}
                        onChange={(e) => setDriverPerfStartDate(e.target.value)}
                        max={driverPerfEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={driverPerfEndDate}
                        onChange={(e) => setDriverPerfEndDate(e.target.value)}
                        min={driverPerfStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
                {driverPerfDateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={driverPerfStartDate}
                        onChange={(e) => setDriverPerfStartDate(e.target.value)}
                        max={driverPerfEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={driverPerfEndDate}
                        onChange={(e) => setDriverPerfEndDate(e.target.value)}
                        min={driverPerfStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver (Optional)</label>
                  <select
                    value={driverPerfDriver}
                    onChange={(e) => setDriverPerfDriver(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Drivers</option>
                    {allDrivers?.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleDriverPerfExport}
                  disabled={!driverPerformanceMetrics || driverPerformanceMetrics.length === 0}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Driver Performance Report Table */}
            {driverPerfLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : driverPerformanceMetrics && driverPerformanceMetrics.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total KM</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Fare/Trip</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg KM/Trip</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completion %</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cancellation %</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sub Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Airport Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rental Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Manual Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UPI Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Others Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Day</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worst Day</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {driverPerformanceMetrics.map((driver, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{driver.driverName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{driver.totalTrips}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(driver.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{driver.totalKm.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.avgFarePerTrip)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{driver.avgKmPerTrip.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              driver.completionRate >= 90 ? 'bg-green-100 text-green-800' :
                              driver.completionRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {driver.completionRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              driver.cancellationRate <= 5 ? 'bg-green-100 text-green-800' :
                              driver.cancellationRate <= 15 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {driver.cancellationRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.revenueByType.subscription)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.revenueByType.airport)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.revenueByType.rental)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.revenueByType.manual)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.paymentBreakdown.cash)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.paymentBreakdown.upi)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(driver.paymentBreakdown.others)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {driver.bestDay ? (
                              <div>
                                <div>{formatDate(driver.bestDay.date)}</div>
                                <div className="text-xs text-gray-500">{formatCurrency(driver.bestDay.revenue)}</div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {driver.worstDay ? (
                              <div>
                                <div>{formatDate(driver.worstDay.date)}</div>
                                <div className="text-xs text-gray-500">{formatCurrency(driver.worstDay.revenue)}</div>
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {driverPerformanceMetrics.length} driver{driverPerformanceMetrics.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No driver performance data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 6 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={vehicleUtilDateRange}
                    onChange={(e) => setVehicleUtilDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {vehicleUtilDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={vehicleUtilDate}
                      onChange={(e) => setVehicleUtilDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {vehicleUtilDateRange === 'week' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={vehicleUtilStartDate}
                        onChange={(e) => setVehicleUtilStartDate(e.target.value)}
                        max={vehicleUtilEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={vehicleUtilEndDate}
                        onChange={(e) => setVehicleUtilEndDate(e.target.value)}
                        min={vehicleUtilStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
                {vehicleUtilDateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={vehicleUtilStartDate}
                        onChange={(e) => setVehicleUtilStartDate(e.target.value)}
                        max={vehicleUtilEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={vehicleUtilEndDate}
                        onChange={(e) => setVehicleUtilEndDate(e.target.value)}
                        min={vehicleUtilStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle (Optional)</label>
                  <select
                    value={vehicleUtilVehicle}
                    onChange={(e) => setVehicleUtilVehicle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Vehicles</option>
                    {allVehicles?.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.reg_no}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleVehicleUtilExport}
                  disabled={!vehicleUtilizationMetrics || vehicleUtilizationMetrics.length === 0}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Vehicle Utilization Report Table */}
            {vehicleUtilLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : vehicleUtilizationMetrics && vehicleUtilizationMetrics.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total KM</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Trips/Day</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg KM/Day</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization %</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Active Days</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sub Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Airport Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rental Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Manual Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver Assignments</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maintenance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vehicleUtilizationMetrics.map((vehicle, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{vehicle.vehicleReg}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{vehicle.totalTrips}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(vehicle.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{vehicle.totalKm.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{vehicle.avgTripsPerDay.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{vehicle.avgKmPerDay.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              vehicle.utilizationPercentage >= 70 ? 'bg-green-100 text-green-800' :
                              vehicle.utilizationPercentage >= 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {vehicle.utilizationPercentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {vehicle.activeDaysCount} / {vehicle.totalDays}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(vehicle.revenueByType.subscription)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(vehicle.revenueByType.airport)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(vehicle.revenueByType.rental)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(vehicle.revenueByType.manual)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={vehicle.driverAssignments}>
                            {vehicle.driverAssignments}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              vehicle.maintenanceStatus === 'operational' ? 'bg-green-100 text-green-800' :
                              vehicle.maintenanceStatus === 'service' ? 'bg-yellow-100 text-yellow-800' :
                              vehicle.maintenanceStatus === 'ets' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {vehicle.maintenanceStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {vehicleUtilizationMetrics.length} vehicle{vehicleUtilizationMetrics.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No vehicle utilization data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 7 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={customerAnalysisDateRange}
                    onChange={(e) => setCustomerAnalysisDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {customerAnalysisDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={customerAnalysisDate}
                      onChange={(e) => setCustomerAnalysisDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {customerAnalysisDateRange === 'week' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customerAnalysisStartDate}
                        onChange={(e) => setCustomerAnalysisStartDate(e.target.value)}
                        max={customerAnalysisEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customerAnalysisEndDate}
                        onChange={(e) => setCustomerAnalysisEndDate(e.target.value)}
                        min={customerAnalysisStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
                {customerAnalysisDateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customerAnalysisStartDate}
                        onChange={(e) => setCustomerAnalysisStartDate(e.target.value)}
                        max={customerAnalysisEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customerAnalysisEndDate}
                        onChange={(e) => setCustomerAnalysisEndDate(e.target.value)}
                        min={customerAnalysisStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={handleCustomerAnalysisExport}
                  disabled={!customerAnalysisMetrics || customerAnalysisMetrics.length === 0}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Customer Analysis Report Table */}
            {customerAnalysisLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : customerAnalysisMetrics && customerAnalysisMetrics.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total KM</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Fare/Trip</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Booking Frequency</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sub Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Airport Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rental Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Manual Trips</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Preference</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Trip</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lifetime Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customerAnalysisMetrics.map((customer, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.customerName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{customer.customerPhone || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{customer.totalTrips}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(customer.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{customer.totalKm.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(customer.avgFarePerTrip)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {customer.bookingFrequency.toFixed(2)} <span className="text-xs text-gray-500">trips/day</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{customer.tripTypeBreakdown.subscription}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{customer.tripTypeBreakdown.airport}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{customer.tripTypeBreakdown.rental}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{customer.tripTypeBreakdown.manual}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              customer.preferredPaymentMode === 'Cash' ? 'bg-green-100 text-green-800' :
                              customer.preferredPaymentMode === 'UPI' ? 'bg-blue-100 text-blue-800' :
                              customer.preferredPaymentMode === 'Others' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {customer.preferredPaymentMode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {customer.lastTripDate ? formatDate(customer.lastTripDate) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(customer.lifetimeValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {customerAnalysisMetrics.length} customer{customerAnalysisMetrics.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No customer analysis data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 8 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={hubPerfDateRange}
                    onChange={(e) => setHubPerfDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {hubPerfDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={hubPerfDate}
                      onChange={(e) => setHubPerfDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {hubPerfDateRange === 'week' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={hubPerfStartDate}
                        onChange={(e) => setHubPerfStartDate(e.target.value)}
                        max={hubPerfEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={hubPerfEndDate}
                        onChange={(e) => setHubPerfEndDate(e.target.value)}
                        min={hubPerfStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
                {hubPerfDateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={hubPerfStartDate}
                        onChange={(e) => setHubPerfStartDate(e.target.value)}
                        max={hubPerfEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={hubPerfEndDate}
                        onChange={(e) => setHubPerfEndDate(e.target.value)}
                        min={hubPerfStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                  <select
                    value={hubPerfHub}
                    onChange={(e) => setHubPerfHub(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Hubs</option>
                    {hubs?.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleHubPerfExport}
                  disabled={!hubPerformanceMetrics || hubPerformanceMetrics.length === 0}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Hub Performance Report Table */}
            {hubPerfLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : hubPerformanceMetrics && hubPerformanceMetrics.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total KM</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sub Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Airport Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rental Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Manual Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Drivers</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vehicles</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver List</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle List</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peak Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peak Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {hubPerformanceMetrics.map((hub, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{hub.hubName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{hub.totalTrips}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(hub.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.totalKm.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.tripTypeDistribution.subscription}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.tripTypeDistribution.airport}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.tripTypeDistribution.rental}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.tripTypeDistribution.manual}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.driverCount}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.vehicleCount}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={hub.driverAllocation}>
                            {hub.driverAllocation}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={hub.vehicleAllocation}>
                            {hub.vehicleAllocation}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={hub.peakHours}>
                            {hub.peakHours}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={hub.peakDays}>
                            {hub.peakDays}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {hubPerformanceMetrics.length} hub{hubPerformanceMetrics.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No hub performance data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 9 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={revenueAnalysisDateRange}
                    onChange={(e) => setRevenueAnalysisDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {revenueAnalysisDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={revenueAnalysisDate}
                      onChange={(e) => setRevenueAnalysisDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {revenueAnalysisDateRange === 'week' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={revenueAnalysisStartDate}
                        onChange={(e) => setRevenueAnalysisStartDate(e.target.value)}
                        max={revenueAnalysisEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={revenueAnalysisEndDate}
                        onChange={(e) => setRevenueAnalysisEndDate(e.target.value)}
                        min={revenueAnalysisStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
                {revenueAnalysisDateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={revenueAnalysisStartDate}
                        onChange={(e) => setRevenueAnalysisStartDate(e.target.value)}
                        max={revenueAnalysisEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={revenueAnalysisEndDate}
                        onChange={(e) => setRevenueAnalysisEndDate(e.target.value)}
                        min={revenueAnalysisStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={handleRevenueAnalysisExport}
                  disabled={!revenueAnalysisMetrics}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Revenue Analysis Report */}
            {revenueAnalysisLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : revenueAnalysisMetrics ? (
              <div className="space-y-6">
                {/* Revenue by Trip Type */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue by Trip Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600">Subscription</div>
                      <div className="text-xl font-bold text-blue-600">{formatCurrency(revenueAnalysisMetrics.revenueByTripType.subscription)}</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Airport</div>
                      <div className="text-xl font-bold text-green-600">{formatCurrency(revenueAnalysisMetrics.revenueByTripType.airport)}</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-gray-600">Rental</div>
                      <div className="text-xl font-bold text-yellow-600">{formatCurrency(revenueAnalysisMetrics.revenueByTripType.rental)}</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600">Manual</div>
                      <div className="text-xl font-bold text-purple-600">{formatCurrency(revenueAnalysisMetrics.revenueByTripType.manual)}</div>
                    </div>
                  </div>
                </div>

                {/* Revenue by Payment Mode */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue by Payment Mode</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Cash</div>
                      <div className="text-xl font-bold text-green-600">{formatCurrency(revenueAnalysisMetrics.revenueByPaymentMode.cash)}</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600">UPI</div>
                      <div className="text-xl font-bold text-blue-600">{formatCurrency(revenueAnalysisMetrics.revenueByPaymentMode.upi)}</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600">Others</div>
                      <div className="text-xl font-bold text-purple-600">{formatCurrency(revenueAnalysisMetrics.revenueByPaymentMode.others)}</div>
                    </div>
                  </div>
                </div>

                {/* Revenue by Hub */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Revenue by Hub</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {revenueAnalysisMetrics.revenueByHub.map((hub, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{hub.hub}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(hub.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Revenue by Driver */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Revenue by Driver</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {revenueAnalysisMetrics.revenueByDriver.slice(0, 20).map((driver, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{driver.driver}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(driver.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {revenueAnalysisMetrics.revenueByDriver.length > 20 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                        Showing top 20 drivers. Export CSV for complete list.
                      </div>
                    )}
                  </div>
                </div>

                {/* Revenue Trends - Daily */}
                {revenueAnalysisMetrics.dailyRevenueTrend.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Daily Revenue Trend</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Fare</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {revenueAnalysisMetrics.dailyRevenueTrend.map((trend, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trend.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.revenue)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{trend.trips}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(trend.avgFare)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Revenue Trends - Weekly */}
                {revenueAnalysisMetrics.weeklyRevenueTrend.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Weekly Revenue Trend</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week Start</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Fare</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {revenueAnalysisMetrics.weeklyRevenueTrend.map((trend, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trend.week)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.revenue)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{trend.trips}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(trend.avgFare)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Revenue Trends - Monthly */}
                {revenueAnalysisMetrics.monthlyRevenueTrend.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Monthly Revenue Trend</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Fare</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {revenueAnalysisMetrics.monthlyRevenueTrend.map((trend, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{trend.month}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.revenue)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{trend.trips}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(trend.avgFare)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No revenue analysis data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Mode Analysis Report */}
      {activeTab === 10 && (
        <div>
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={paymentModeDateRange}
                    onChange={(e) => setPaymentModeDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {paymentModeDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={paymentModeDate}
                      onChange={(e) => setPaymentModeDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {(paymentModeDateRange === 'week' || paymentModeDateRange === 'custom') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={paymentModeStartDate}
                        onChange={(e) => setPaymentModeStartDate(e.target.value)}
                        max={paymentModeEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={paymentModeEndDate}
                        onChange={(e) => setPaymentModeEndDate(e.target.value)}
                        min={paymentModeStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={handlePaymentModeExport}
                  disabled={!paymentModeMetrics}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {paymentModeLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : paymentModeMetrics ? (
              <div className="space-y-6">
                {/* Revenue by Payment Mode */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue by Payment Mode</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Cash</div>
                      <div className="text-xl font-bold text-green-600">{formatCurrency(paymentModeMetrics.revenueByMode.cash)}</div>
                      <div className="text-xs text-gray-500 mt-1">{paymentModeMetrics.countByMode.cash} trips</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600">UPI</div>
                      <div className="text-xl font-bold text-blue-600">{formatCurrency(paymentModeMetrics.revenueByMode.upi)}</div>
                      <div className="text-xs text-gray-500 mt-1">{paymentModeMetrics.countByMode.upi} trips</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600">Others</div>
                      <div className="text-xl font-bold text-purple-600">{formatCurrency(paymentModeMetrics.revenueByMode.others)}</div>
                      <div className="text-xs text-gray-500 mt-1">{paymentModeMetrics.countByMode.others} trips</div>
                    </div>
                  </div>
                </div>

                {/* Payment Mode Trends */}
                {paymentModeMetrics.dailyTrend.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Payment Mode Trends (Daily)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Count</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UPI Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UPI Count</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Others Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Others Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paymentModeMetrics.dailyTrend.map((trend, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trend.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.cash)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{trend.cashCount}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.upi)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{trend.upiCount}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.others)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{trend.othersCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment Mode by Trip Type */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Payment Mode by Trip Type</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Count</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UPI Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UPI Count</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Others Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Others Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(paymentModeMetrics.byTripType).map(([type, data]) => (
                          <tr key={type} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{type}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(data.cash)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{data.cashCount}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(data.upi)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{data.upiCount}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(data.others)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{data.othersCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Mode by Hub */}
                {paymentModeMetrics.byHub.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Payment Mode by Hub</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Count</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UPI Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UPI Count</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Others Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Others Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paymentModeMetrics.byHub.map((hub, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{hub.hub}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(hub.cash)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.cashCount}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(hub.upi)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.upiCount}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(hub.others)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{hub.othersCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Outstanding Payments */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Outstanding Payments</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-gray-600">Outstanding Trips</div>
                      <div className="text-xl font-bold text-yellow-600">{paymentModeMetrics.outstandingTrips}</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-sm text-gray-600">Outstanding Revenue</div>
                      <div className="text-xl font-bold text-red-600">{formatCurrency(paymentModeMetrics.outstandingRevenue)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No payment mode analysis data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Peak Hours/Days Report */}
      {activeTab === 11 && (
        <div>
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={peakHoursDateRange}
                    onChange={(e) => setPeakHoursDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {peakHoursDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={peakHoursDate}
                      onChange={(e) => setPeakHoursDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {(peakHoursDateRange === 'week' || peakHoursDateRange === 'custom') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={peakHoursStartDate}
                        onChange={(e) => setPeakHoursStartDate(e.target.value)}
                        max={peakHoursEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={peakHoursEndDate}
                        onChange={(e) => setPeakHoursEndDate(e.target.value)}
                        min={peakHoursStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={handlePeakHoursExport}
                  disabled={!peakHoursMetrics}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {peakHoursLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : peakHoursMetrics ? (
              <div className="space-y-6">
                {/* Trips by Hour */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Trips by Hour of Day</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hour</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {peakHoursMetrics.tripsByHour.map((hour, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{hour.hour}:00</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{hour.trips}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(hour.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Trips by Day */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Trips by Day of Week</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {peakHoursMetrics.tripsByDay.map((day, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{day.dayName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{day.trips}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(day.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Busiest Routes */}
                {peakHoursMetrics.busiestRoutes.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Busiest Routes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {peakHoursMetrics.busiestRoutes.map((route, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{route.route}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{route.trips}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(route.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Driver/Vehicle Demand */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Driver Demand Patterns</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {peakHoursMetrics.driverDemand.slice(0, 10).map((driver, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{driver.driver}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{driver.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Vehicle Demand Patterns</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trips</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {peakHoursMetrics.vehicleDemand.slice(0, 10).map((vehicle, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{vehicle.vehicle}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{vehicle.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No peak hours/days data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation & No-Show Report */}
      {activeTab === 12 && (
        <div>
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={cancellationDateRange}
                    onChange={(e) => setCancellationDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {cancellationDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={cancellationDate}
                      onChange={(e) => setCancellationDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {(cancellationDateRange === 'week' || cancellationDateRange === 'custom') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={cancellationStartDate}
                        onChange={(e) => setCancellationStartDate(e.target.value)}
                        max={cancellationEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={cancellationEndDate}
                        onChange={(e) => setCancellationEndDate(e.target.value)}
                        min={cancellationStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={handleCancellationExport}
                  disabled={!cancellationMetrics}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {cancellationLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : cancellationMetrics ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Summary</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Total Trips</div>
                      <div className="text-xl font-bold text-gray-900">{cancellationMetrics.totalTrips}</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-sm text-gray-600">Cancelled</div>
                      <div className="text-xl font-bold text-red-600">{cancellationMetrics.cancelledTrips}</div>
                      <div className="text-xs text-gray-500 mt-1">{cancellationMetrics.cancellationRate.toFixed(1)}%</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Completed</div>
                      <div className="text-xl font-bold text-green-600">{cancellationMetrics.totalTrips - cancellationMetrics.cancelledTrips}</div>
                    </div>
                  </div>
                </div>

                {/* By Trip Type */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Cancellations by Trip Type</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cancelled</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(cancellationMetrics.byTripType).map(([type, data]) => (
                          <tr key={type} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{type}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{data.cancelled}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{data.cancelled}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* By Hub */}
                {cancellationMetrics.byHub.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Cancellations by Hub</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cancelled</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {cancellationMetrics.byHub.map((hub, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{hub.hub}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{hub.cancelled}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{hub.cancelled}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* By Driver */}
                {cancellationMetrics.byDriver.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Cancellations by Driver</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cancelled</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {cancellationMetrics.byDriver.map((driver, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{driver.driver}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{driver.cancelled}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{driver.cancelled}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* By Customer */}
                {cancellationMetrics.byCustomer.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Customer Cancellation Patterns</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cancelled</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {cancellationMetrics.byCustomer.slice(0, 20).map((customer, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.customerName}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{customer.cancelled}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{customer.cancelled}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {cancellationMetrics.byCustomer.length > 20 && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                          Showing top 20 customers. Export CSV for complete list.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No cancellation data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Performance Report */}
      {activeTab === 13 && (
        <div>
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={subscriptionPerfDateRange}
                    onChange={(e) => setSubscriptionPerfDateRange(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {subscriptionPerfDateRange === 'day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={subscriptionPerfDate}
                      onChange={(e) => setSubscriptionPerfDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {(subscriptionPerfDateRange === 'week' || subscriptionPerfDateRange === 'custom') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={subscriptionPerfStartDate}
                        onChange={(e) => setSubscriptionPerfStartDate(e.target.value)}
                        max={subscriptionPerfEndDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={subscriptionPerfEndDate}
                        onChange={(e) => setSubscriptionPerfEndDate(e.target.value)}
                        min={subscriptionPerfStartDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={handleSubscriptionPerfExport}
                  disabled={!subscriptionPerfMetrics}
                  className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {subscriptionPerfLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : subscriptionPerfMetrics ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-sm text-gray-600">Active Subscriptions</div>
                    <div className="text-2xl font-bold text-primary mt-2">{subscriptionPerfMetrics.activeSubscriptions}</div>
                    <div className="text-xs text-gray-500 mt-1">of {subscriptionPerfMetrics.totalSubscriptions} total</div>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-sm text-gray-600">Subscription Rides</div>
                    <div className="text-2xl font-bold text-blue-600 mt-2">{subscriptionPerfMetrics.subscriptionRidesCount}</div>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-sm text-gray-600">Subscription Revenue</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(subscriptionPerfMetrics.subscriptionRevenue)}</div>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-sm text-gray-600">Utilization Rate</div>
                    <div className="text-2xl font-bold text-purple-600 mt-2">{subscriptionPerfMetrics.utilizationRate.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">rides/subscription</div>
                  </div>
                </div>

                {/* Customer Retention */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Customer Retention</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600">Retained Customers</div>
                      <div className="text-xl font-bold text-blue-600">{subscriptionPerfMetrics.retainedCustomers}</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Retention Rate</div>
                      <div className="text-xl font-bold text-green-600">{subscriptionPerfMetrics.retentionRate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {/* Subscription Trends - Daily */}
                {subscriptionPerfMetrics.dailyTrend.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Daily Subscription Trends</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rides</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {subscriptionPerfMetrics.dailyTrend.map((trend, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trend.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{trend.rides}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Subscription Trends - Weekly */}
                {subscriptionPerfMetrics.weeklyTrend.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Weekly Subscription Trends</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week Start</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rides</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {subscriptionPerfMetrics.weeklyTrend.map((trend, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(trend.week)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{trend.rides}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Subscription Trends - Monthly */}
                {subscriptionPerfMetrics.monthlyTrend.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">Monthly Subscription Trends</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rides</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {subscriptionPerfMetrics.monthlyTrend.map((trend, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{trend.month}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{trend.rides}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(trend.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No subscription performance data found for selected filters</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

