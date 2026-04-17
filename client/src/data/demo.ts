import type { ChecklistTemplate, DailyPlan, EquipmentRecord, Priority, RemotePlanBundle } from '@/types'
import { nowIso, todayKey } from '@/lib/app-utils'

export const DEFAULT_EMPLOYEE_ID = 1
export const DEFAULT_INSPECTOR_NAME = 'Обходчик смены'

export const DEFAULT_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'pump-station',
    name: 'Насосная станция',
    version: 1,
    items: [
      {
        id: 'temperature',
        label: 'Температура корпуса',
        type: 'number',
        required: true,
        range: { min: 15, max: 90, unit: '°C' },
        hint: 'Вне диапазона осмотр нельзя завершить.',
      },
      {
        id: 'pressure',
        label: 'Давление на линии',
        type: 'number',
        required: true,
        range: { min: 2, max: 12, unit: 'бар' },
      },
      {
        id: 'vibration',
        label: 'Вибрация',
        type: 'number',
        required: true,
        range: { min: 0, max: 6, unit: 'мм/с' },
      },
      {
        id: 'lubrication',
        label: 'Смазка',
        type: 'select',
        required: true,
        options: [
          { value: 'ok', label: 'Норма' },
          { value: 'low', label: 'Низкий уровень' },
          { value: 'replace', label: 'Нужна замена' },
        ],
      },
      {
        id: 'leak',
        label: 'Есть подтёк',
        type: 'boolean',
        required: true,
      },
      {
        id: 'comment',
        label: 'Комментарий',
        type: 'text',
        required: false,
        placeholder: 'Например: посторонний шум в районе муфты',
      },
    ],
  },
  {
    id: 'valve-node',
    name: 'Запорная арматура',
    version: 1,
    items: [
      {
        id: 'temperature',
        label: 'Температура узла',
        type: 'number',
        required: true,
        range: { min: 5, max: 70, unit: '°C' },
      },
      {
        id: 'pressure',
        label: 'Давление',
        type: 'number',
        required: true,
        range: { min: 1, max: 16, unit: 'бар' },
      },
      {
        id: 'vibration',
        label: 'Вибрация штока',
        type: 'number',
        required: true,
        range: { min: 0, max: 4, unit: 'мм/с' },
      },
      {
        id: 'position',
        label: 'Положение арматуры',
        type: 'select',
        required: true,
        options: [
          { value: 'open', label: 'Открыта' },
          { value: 'half', label: 'Промежуточно' },
          { value: 'closed', label: 'Закрыта' },
        ],
      },
      {
        id: 'corrosion',
        label: 'Есть следы коррозии',
        type: 'boolean',
        required: true,
      },
      {
        id: 'comment',
        label: 'Комментарий',
        type: 'text',
        required: false,
        placeholder: 'Например: затруднён ход рукоятки',
      },
    ],
  },
]

function createDemoEquipment(
  id: number,
  name: string,
  location: string,
  priority: Priority,
  checklistTemplateId: string,
): EquipmentRecord {
  return {
    id: `equipment-${id}`,
    backendId: id,
    name,
    location,
    priority,
    checklistTemplateId,
    equipmentStatus: 'operational',
    expectedQrCode: `CANARY-EQ-${id.toString().padStart(3, '0')}`,
    updatedAt: nowIso(),
  }
}

export function resolveTemplateId(equipmentName: string): string {
  const value = equipmentName.toLowerCase()
  if (value.includes('клапан') || value.includes('арматур') || value.includes('вентил')) {
    return 'valve-node'
  }

  return 'pump-station'
}

export function createDemoPlanBundle(): RemotePlanBundle {
  const equipment = [
    createDemoEquipment(101, 'Насос ПН-101', 'Корпус А, секция 1', 'high', 'pump-station'),
    createDemoEquipment(102, 'Клапан КЛ-17', 'Корпус А, секция 2', 'medium', 'valve-node'),
    createDemoEquipment(103, 'Насос ПН-205', 'Корпус Б, секция 4', 'high', 'pump-station'),
    createDemoEquipment(104, 'Арматура АР-9', 'Корпус Б, секция 5', 'low', 'valve-node'),
  ]

  const plan: DailyPlan = {
    id: `plan-${todayKey()}`,
    date: todayKey(),
    source: 'demo',
    syncedAt: nowIso(),
    items: equipment.map((item, index) => ({
      equipmentId: item.id,
      order: index + 1,
      priority: item.priority,
    })),
  }

  return { plan, equipment }
}
