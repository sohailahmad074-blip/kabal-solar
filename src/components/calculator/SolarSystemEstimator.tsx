import React, { useState } from 'react';
import { 
  Calculator, 
  Sun, 
  Zap, 
  BatteryCharging, 
  FileText, 
  Layers, 
  Leaf, 
  ArrowRight
} from 'lucide-react';
import { ShopSettings, ProductItem } from '../../types/solar';
import { calculateSolarSystem, formatCurrency } from '../../utils/formatters';

interface SolarSystemEstimatorProps {
  settings: ShopSettings;
  products: ProductItem[];
  onGenerateQuote: (estimateData: {
    systemCapacityKw: number;
    systemType: 'ON_GRID' | 'HYBRID' | 'OFF_GRID' | 'SOLAR_PUMP';
    panelCount: number;
    inverterKw: number;
    batteryKwh: number;
    estimatedCost: number;
  }) => void;
}

export const SolarSystemEstimator: React.FC<SolarSystemEstimatorProps> = ({
  settings,
  products,
  onGenerateQuote,
}) => {
  const [monthlyUnitsKwh, setMonthlyUnitsKwh] = useState<number>(850);
  const [monthlyBillAmount, setMonthlyBillAmount] = useState<number>(220);
  const [useBillAmount, setUseBillAmount] = useState<boolean>(false);
  const [averageRatePerKwh, setAverageRatePerKwh] = useState<number>(0.26);
  const [systemType, setSystemType] = useState<'ON_GRID' | 'HYBRID' | 'OFF_GRID'>('ON_GRID');
  const [targetSolarOffsetPercent, setTargetSolarOffsetPercent] = useState<number>(100);
  const [panelWattage, setPanelWattage] = useState<number>(585);
  const [sunHours, setSunHours] = useState<number>(4.8);

  const result = calculateSolarSystem({
    monthlyUnitsKwh: useBillAmount ? undefined : monthlyUnitsKwh,
    monthlyBillAmount: useBillAmount ? monthlyBillAmount : undefined,
    averageRatePerKwh,
    targetSolarOffsetPercent,
    peakSunHoursPerDay: sunHours,
    panelWattage,
    systemType,
  });

  // Calculate estimated Turnkey cost based on product prices or industry benchmark
  const panelPrice = products.find(p => p.category === 'SOLAR_PANELS' && p.wattageRating === panelWattage)?.sellingPrice || 125;
  const inverterPrice = products.find(p => p.category === 'INVERTERS' && p.wattageRating && p.wattageRating >= result.recommendedInverterKw * 1000)?.sellingPrice || (result.recommendedInverterKw * 140);
  const batteryPrice = systemType !== 'ON_GRID' ? (result.recommendedBatteryKwh * 320) : 0;
  const structurePrice = result.actualArraySizeKw * 65;
  const switchgearPrice = 160;
  const laborPrice = result.actualArraySizeKw * 45;

  const estimatedTotalCost = Math.round(
    (result.panelCount * panelPrice) +
    inverterPrice +
    batteryPrice +
    structurePrice +
    switchgearPrice +
    laborPrice
  );

  const paybackYears = estimatedTotalCost > 0 && result.estimatedYearlySavings > 0
    ? (estimatedTotalCost / result.estimatedYearlySavings).toFixed(1)
    : '3.2';

  const handleConvertQuote = () => {
    onGenerateQuote({
      systemCapacityKw: result.actualArraySizeKw,
      systemType,
      panelCount: result.panelCount,
      inverterKw: result.recommendedInverterKw,
      batteryKwh: result.recommendedBatteryKwh,
      estimatedCost: estimatedTotalCost,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Calculator className="h-4 w-4 text-amber-500" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Solar System Sizing & Instant Quotation Estimator
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculate array kWp capacity, panel counts, inverter sizing, battery storage kWh, and payback ROI.
          </p>
        </div>

        <button
          type="button"
          onClick={handleConvertQuote}
          className="flex items-center gap-1.5 rounded bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Convert to Official Quotation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Inputs Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
              Customer Consumption & Site Parameters
            </h3>

            {/* Input mode switch */}
            <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setUseBillAmount(false)}
                className={`flex-1 py-1 text-center font-semibold rounded transition-colors ${
                  !useBillAmount ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                By Monthly Units (kWh)
              </button>
              <button
                type="button"
                onClick={() => setUseBillAmount(true)}
                className={`flex-1 py-1 text-center font-semibold rounded transition-colors ${
                  useBillAmount ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                By Electricity Bill ({settings.currency})
              </button>
            </div>

            {!useBillAmount ? (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Monthly Consumption (kWh Units):</span>
                  <span className="font-bold text-amber-600">{monthlyUnitsKwh} kWh/mo</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={monthlyUnitsKwh}
                  onChange={(e) => setMonthlyUnitsKwh(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Average Monthly Bill:</span>
                  <span className="font-bold text-amber-600">
                    {formatCurrency(monthlyBillAmount, settings.currency, settings.currencyPosition)}
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="2000"
                  step="10"
                  value={monthlyBillAmount}
                  onChange={(e) => setMonthlyBillAmount(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}

            {/* Grid Rate */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Grid Tariff Rate per kWh ({settings.currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.05"
                value={averageRatePerKwh}
                onChange={(e) => setAverageRatePerKwh(parseFloat(e.target.value) || 0.20)}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none font-medium"
              />
            </div>

            {/* System Type */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Target Architecture
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ON_GRID', 'HYBRID', 'OFF_GRID'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSystemType(type)}
                    className={`rounded border px-2 py-1.5 text-center text-xs font-semibold transition-all cursor-pointer ${
                      systemType === type
                        ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'ON_GRID' ? 'On-Grid' : type === 'HYBRID' ? 'Hybrid' : 'Off-Grid'}
                  </button>
                ))}
              </div>
            </div>

            {/* Solar Offset Percentage */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-700">Solar Energy Offset:</span>
                <span className="font-bold text-emerald-700">{targetSolarOffsetPercent}% Target</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={targetSolarOffsetPercent}
                onChange={(e) => setTargetSolarOffsetPercent(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Panel Wattage & Sun Hours */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                  Panel Rating
                </label>
                <select
                  value={panelWattage}
                  onChange={(e) => setPanelWattage(parseInt(e.target.value))}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value={550}>550W Mono PERC</option>
                  <option value={585}>585W TOPCon Bifacial</option>
                  <option value={620}>620W High Efficiency</option>
                  <option value={700}>700W Utility Scale</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                  Peak Sun Hours
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="3.0"
                  max="7.0"
                  value={sunHours}
                  onChange={(e) => setSunHours(parseFloat(e.target.value) || 4.8)}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Engineering Specs & ROI Results Column */}
        <div className="lg:col-span-7 space-y-3">
          {/* Engineering Specifications Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Recommended Solar Engineering Specifications
              </span>
              <span className="rounded bg-amber-100 text-amber-900 font-bold px-2 py-0.5 text-[10px]">
                {result.actualArraySizeKw} kW Array
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Sun className="h-3 w-3 text-amber-500" />
                  Array Capacity
                </span>
                <p className="mt-0.5 text-base font-bold text-slate-900">{result.actualArraySizeKw} kW</p>
                <p className="text-[10px] text-slate-400">DC Peak Size</p>
              </div>

              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Layers className="h-3 w-3 text-amber-500" />
                  Module Count
                </span>
                <p className="mt-0.5 text-base font-bold text-slate-900">{result.panelCount} Panels</p>
                <p className="text-[10px] text-slate-400">@{panelWattage}W Tier-1</p>
              </div>

              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Inverter Rating
                </span>
                <p className="mt-0.5 text-base font-bold text-slate-900">{result.recommendedInverterKw} kW</p>
                <p className="text-[10px] text-slate-400">{systemType.replace(/_/g, ' ')}</p>
              </div>

              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <BatteryCharging className="h-3 w-3 text-amber-500" />
                  Battery Bank
                </span>
                <p className="mt-0.5 text-base font-bold text-slate-900">{result.recommendedBatteryKwh} kWh</p>
                <p className="text-[10px] text-slate-400">LiFePO4 Storage</p>
              </div>
            </div>

            {/* Estimated Energy Generation */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Daily Generation:</span>
                <span className="font-bold text-slate-900">~{result.estimatedDailyUnitsKwh} kWh / day</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Monthly Generation:</span>
                <span className="font-bold text-emerald-700">~{result.estimatedMonthlyUnitsKwh} kWh / mo</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Required Roof Space:</span>
                <span className="font-medium text-slate-800">~{result.panelCount * 28} sq ft</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">CO2 Offset Saved:</span>
                <span className="font-medium text-emerald-700 flex items-center gap-1">
                  <Leaf className="h-3 w-3" />
                  {result.co2ReductionTonsPerYear} Tons / yr
                </span>
              </div>
            </div>
          </div>

          {/* Turnkey Pricing & Financial ROI Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5 block">
              Estimated Turnkey Installation Cost & Financial ROI
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Estimated Turnkey Cost</span>
                <p className="mt-0.5 text-lg font-black text-slate-900">
                  {formatCurrency(estimatedTotalCost, settings.currency, settings.currencyPosition)}
                </p>
                <p className="text-[10px] text-slate-400">Complete Hardware & Labor</p>
              </div>

              <div className="rounded border border-slate-200 bg-emerald-50/50 p-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Annual Utility Savings</span>
                <p className="mt-0.5 text-lg font-black text-emerald-700">
                  {formatCurrency(result.estimatedYearlySavings, settings.currency, settings.currencyPosition)}
                </p>
                <p className="text-[10px] text-emerald-600">Saved on utility bills</p>
              </div>

              <div className="rounded border border-slate-200 bg-amber-50/50 p-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800">Estimated ROI Payback</span>
                <p className="mt-0.5 text-lg font-black text-amber-900">{paybackYears} Years</p>
                <p className="text-[10px] text-amber-700">Free clean power thereafter</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConvertQuote}
              className="w-full flex items-center justify-center gap-2 rounded bg-amber-400 py-2 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
            >
              <span>Generate Customer Proposal with these Technical Specs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
