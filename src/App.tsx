import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import NumberFormat, { NumberFormatValues } from "react-number-format";

import './App.css';
import { Doughnut } from 'react-chartjs-2';
import 'chartjs-plugin-colorschemes';

type FormData = {
  income: number
  rent: number
  savings: number
}
// osaka https://www.kyoukaikenpo.or.jp/~/media/Files/shared/hokenryouritu/r2/ippan_3/r20927osaka.pdf
const 厚生年金保険料率 = 18.300 / 100
const 健康保険料率 = 10.22 / 100

// 一般雇用保険料率 https://www.mhlw.go.jp/content/000617016.pdf
const 雇用保険料率_労働者負担 = 3 / 1000
const 雇用保険料率_事業主負担 = 6 / 1000

// 労災保険料率 https://www.mhlw.go.jp/content/11200000/000489156.pdf
const 労災保険料率 = 3 / 1000

const 基礎控除額 = 380000
const エンゲル係数 = 0.25

// https://www.nta.go.jp/m/taxanswer/1410.htm
const 給与所得控除計算 = (income: number) => {
  if (income <= 1625000) {
    return Math.min(income, 550000)
  }
  if (income <= 1800000) {
    return income * 0.4 - 100000
  }
  if (income <= 3600000) {
    return income * 0.3 + 80000
  }
  if (income <= 6600000) {
    return income * 0.2 + 440000
  }
  if (income <= 8500000) {
    return income * 0.1 - 1100000
  }
  return 1950000
}
// https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm
const 所得税計算 = (taxable: number) => {
  taxable = Math.floor(taxable / 1000) * 1000
  if (taxable <= 1949000) {
    return taxable * 0.05
  }
  if (taxable <= 3299000) {
    return taxable * 0.1 - 97500
  }
  if (taxable <= 6949000) {
    return taxable * 0.2 - 427500
  }
  if (taxable <= 8999000) {
    return taxable * 0.23 - 636000
  }
  if (taxable <= 17999000) {
    return taxable * 0.33 - 1536000
  }
  if (taxable <= 39999000) {
    return taxable * 0.40 - 2796000
  }
  return taxable * 0.45 - 4796000
}
const numberFormat = new Intl.NumberFormat('ja-JP', {})
const percentageFormat = new Intl.NumberFormat("en-US", {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

type Result = {group: string, label: string, value: number, ratio: number}
const toChartData = (data: Result[]) => {
  return {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
      }
    ]
  }
}
const customColorFunction = (schemeColors: string[]) => {
  schemeColors[0] = '#EEE';
  schemeColors[1] = '#DDD';
  schemeColors[2] = '#CCC';
  // return schemeColors.slice(0, 6)
  // console.log(schemeColors)
}

const chartOptions = {
  plugins: {
    colorschemes: {
        scheme: 'brewer.Paired12',
        custom: customColorFunction
    }
  }
}


function App() {
  const { control, handleSubmit, errors, setValue, getValues } = useForm<FormData>({
    defaultValues: {
      income: 5000000,
      rent: 1000000,
      savings: 500000
    }
  })

  const [result, setResult] = useState([] as Result[]);

  const onSubmit = (formData: FormData) => {
    console.debug(formData)

    const 厚生年金保険料 = Math.floor(formData.income * 厚生年金保険料率 / 2)
    const 健康保険料 = Math.floor(formData.income * 健康保険料率 / 2)
    const 雇用保険料_労働者負担 = Math.floor(formData.income * 雇用保険料率_労働者負担 / 2)
    const 雇用保険料_事業主負担 = Math.floor(formData.income * 雇用保険料率_事業主負担 / 2)
    const 労災保険料_事業主負担 = Math.floor(formData.income * 労災保険料率 / 2)

    const 社会保険料控除 = 厚生年金保険料 + 健康保険料 + 雇用保険料_労働者負担
    const 社会保険料事業主負担 = 厚生年金保険料 + 健康保険料 + 雇用保険料_事業主負担 + 労災保険料_事業主負担
    const 給与所得控除 = 給与所得控除計算(formData.income)
    const 給与所得 = formData.income - 給与所得控除
    const 生命保険料控除 = 120000
    const 扶養控除 = 380000

    const 控除額合計 =社会保険料控除 + 生命保険料控除 + 扶養控除 + 基礎控除額
    const 課税所得金額 = Math.floor(Math.max(0, 給与所得 - 控除額合計) / 1000) * 1000
    const 所得税 = 所得税計算(課税所得金額)
    const 復興特別所得税 = 所得税 * 0.021
    const 所得税年税額 = Math.floor((所得税 + 復興特別所得税) / 100) * 100
    const 住民税 = 課税所得金額 * 0.1

    const 税金 = 所得税 + 住民税 + 社会保険料控除
    const 推定消費額 = formData.income - 税金 - formData.rent - formData.savings // 消費税も含む額
      
    const 軽減税率考慮した消費税率 = エンゲル係数 * 0.08 + (1-エンゲル係数) * 0.1
    const 消費税を除いた消費額 = Math.floor(推定消費額 / (1 + 軽減税率考慮した消費税率))
    const 消費税 = 推定消費額 - 消費税を除いた消費額 
    const 税金等合計 = 消費税 + 税金

    setResult([
      {group: '', label: '収入', value: formData.income, ratio: formData.income / formData.income},
      {group: '支出', label: '家賃', value: formData.rent, ratio: formData.rent / formData.income},
      {group: '支出', label: '貯蓄額', value: formData.savings, ratio: formData.savings / formData.income},
      {group: '支出', label: '推定消費金額', value: 消費税を除いた消費額, ratio: 消費税を除いた消費額 / formData.income},
      {group: '支出', label: '社会保険料', value: 社会保険料控除, ratio: 社会保険料控除 / formData.income},
      {group: '支出', label: '所得税', value: 所得税年税額, ratio: 所得税年税額 / formData.income},
      {group: '支出', label: '住民税', value: 住民税, ratio: 住民税 / formData.income},
      {group: '支出', label: '消費税', value: 消費税, ratio: 消費税 / formData.income},
      {group: '', label: '税金等合計', value: 税金等合計, ratio: 税金等合計 / formData.income},
    ])

    console.log('社会保険料事業主負担', 社会保険料事業主負担)
  };

  return (
    <div className="App w-full max-w-md container mx-auto p-2 m-4 text-gray-700">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md rounded px-3 pt-6 pb-8 mb-4">
        <h1 className="text-xl mb-4">税金等の支払い額をざっくり計算</h1>
        <div className="flex m-2 align-bottom">
          <label className="w-full block text-sm font-bold mb-2">年間収入<br />（給与・賞与）</label>
          <Controller
            name="income"
            control={control}
            render={() => (
              <NumberFormat
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight text-right focus:outline-none focus:shadow-outline"
                thousandSeparator={true}
                defaultValue={5000000}
                onValueChange={(values: NumberFormatValues) => {
                  setValue('income', values.floatValue)
                }}
              />
            )}
            rules={{
              min: {
                value: 1,
                message: "1以上にしてください"
              }
            }}
          />
          <span className="m-1">円</span>
        </div>

        <div className="flex m-2">
          <label className="w-full block text-sm font-bold mb-2">年間支払家賃</label>
          <Controller
            name="rent"
            control={control}
            render={() => (
              <NumberFormat
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight text-right focus:outline-none focus:shadow-outline"
                thousandSeparator={true}
                defaultValue={1000000}
                onValueChange={(values: NumberFormatValues) => {
                  setValue('rent', values.floatValue)
                }}
              />
            )}
            rules={{
              min: {
                value: 0,
                message: "0以上にしてください"
              },
              validate: () => {
                return getValues('income') >= getValues('rent') + getValues('savings')
              }
            }}
          />
          <span className="m-1">円</span>
        </div>

        <div className="flex m-2">
          <label className="w-full block text-sm font-bold mb-2">年間貯蓄金額</label>
          <Controller
            name="savings"
            control={control}
            render={() => (
              <NumberFormat
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight text-right focus:outline-none focus:shadow-outline"
                thousandSeparator={true}
                defaultValue={500000}
                onValueChange={(values: NumberFormatValues) => {
                  setValue('savings', values.floatValue)
                }}
              />
            )}
            rules={{
              min: {
                value: 0,
                message: "0以上にしてください"
              },
              validate: () => {
                return getValues('income') >= getValues('rent') + getValues('savings')
              }
            }}
          />          
          <span className="m-1">円</span>
        </div>

        <div className="text-center">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="submit">
            計算
          </button>
        </div>

        { 
          (errors.income || errors.rent || errors.savings) &&
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mt-2 rounded relative" role="alert">
            <strong className="font-bold">数値が変です</strong>
          </div>
        }

      </form>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <Doughnut
            data={toChartData(result.filter(d => d.group === '支出'))}
            options={chartOptions}
            height={400}
            />

        <table className="w-full text-left">
          <tbody>
            {
              result.map((item) => (
                <tr key={ item.label }>
                  <th>{ item.label }</th>
                  <td className="text-right">{ numberFormat.format(item.value) }</td>
                  <td className="text-right">{ percentageFormat.format(item.ratio)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>

      </div>
    </div>
  );
}

export default App;
