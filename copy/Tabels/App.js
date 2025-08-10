import React, { useState, useEffect, useMemo } from 'react';
import { Info, FileText, Package, Wrench, Zap, Search,RefreshCw, Flag, Tag } from 'lucide-react';
import Papa from 'papaparse';
const handleClick = () => {
  window.location.href = ("https://pwg-udm.igatec.com/power-catalogs/app/workspaces");
}

const InventoryDashboard = () => {
  const [activeSection, setActiveSection] = useState('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cppMessage, setCppMessage] = useState('');

  const menuItems = [
    { id: 'info', icon: Info, label: 'Общая\nинформация', color: 'bg-blue-500' },
    { id: 'history', icon: FileText, label: 'История\nдетали', color: 'bg-blue-400' },
    { id: 'order', icon: Package, label: 'Заказ', color: 'bg-blue-300' },
    { id: 'help', icon: Wrench, label: 'Помощь', color: 'bg-blue-200' },
    { id: 'powerguide', icon: Zap, label: 'PowerGuide', color: 'bg-blue-100' },
  ];

  const callCppHelloAPI = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/all');
      if (!res.ok) throw new Error(`HTTP ошибка! статус: ${res.status}`);
      const data = await res.json();
      console.log('From C++ backend:', data.output);
      setCppMessage(data.output);
    } catch (err) {
      console.error('Ошибка при вызове API:', err);
      setCppMessage('Обновите страницу!');
    }
  };

  const callPyHelloAPI = async () => {
  try {
    // 1. Запускаем объединение CSV на сервере
    const res = await fetch('http://localhost:3001/api/merged_csv');
    if (!res.ok) throw new Error(`HTTP ошибка! статус: ${res.status}`);

    const result = await res.json();
    console.log('Ответ сервера:', result);

    // 2. Сохраняем сообщение о статусе
    setCppMessage(result.message || 'Операция завершена');

    // 3. После объединения — подгружаем новый CSV
    const csvRes = await fetch('/Tabels/output.csv');
    if (!csvRes.ok) throw new Error(`Не удалось загрузить output.csv`);

    const csvText = await csvRes.text();
    console.log('CSV данные:', csvText);

    // Если у тебя есть функция parseCSV — вызываем её
    // parseCSV(csvText);

  } catch (err) {
    console.error('Ошибка при вызове API:', err);
    setCppMessage('Ошибка при обновлении данных');
  }
};


  const handleSidebarClick = (id) => {
    setActiveSection(id);
    if (id === 'info') {
      callCppHelloAPI();
    }
  };

  // Функция для определения статуса на основе количества
  const getStatusFromQuantity = (quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty <= 5) return 'critical';
    if (qty <= 50) return 'warning';
    return 'good';
  };

// Генерация тестовых данных
useEffect(() => {
  const loadCSVData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/Tabels/output.csv');
      if (!response.ok) {
        throw new Error(`Ошибка загрузки файла: ${response.statusText}`);
      }

      // Получаем бинарные данные
      const buffer = await response.arrayBuffer();

      // Декодируем содержимое (UTF-8)
      const decoder = new TextDecoder('UTF-8');
      const csvText = decoder.decode(buffer);

      // Функция для очистки кракозябр
      const cleanString = (str) => {
        if (!str) return '';
        return str.replace(/�+/g, '').trim();
      };

      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }

          const headers = [
            "Номер детали",
            "Наименование",
            "Количество на складе",
            "Местоположение на складе",
            "Прошлая используемая деталь",
            "Следующая используемая деталь",
            "Страна производства",
            "Поставщик",
            "Дата поставки",
            "Длительность последней доставки"
          ];

          const processedData = results.data
            // фильтруем строки, где первый столбец начинается с -1
            .filter((row) => {
              const firstCell = String(row[0] || '').trim();
              return !firstCell.startsWith('-1');
            })
            // обрабатываем оставшиеся строки
            .map((row) => {
              const item = {};
              headers.forEach((key, i) => {
                let value = row[i] !== undefined ? String(row[i]).trim() : '';
                value = cleanString(value); // чистим от кракозябр
                item[key] = value;
              });

              const quantity = parseInt(item["Количество на складе"]) || 0;

              return {
                id: item["Номер детали"],
                name: item["Местоположение на складе"],
                quantity: quantity,
                status: getStatusFromQuantity(quantity),
                fullData: item
              };
            });

          setInventoryData(processedData);
          setLoading(false);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          setError(`Ошибка парсинга CSV: ${error.message}`);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Ошибка чтения файла:', err);
      setError(`Ошибка чтения файла: ${err.message}`);
      setLoading(false);
    }
  };

  loadCSVData();
}, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'status-badge status-critical';
      case 'warning': return 'status-badge status-warning';
      case 'good': return 'status-badge status-good';
      default: return 'status-badge';
    }
  };

  const filteredData = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Компонент общей информации
  const InfoSection = () => (
    <div className="fade-in">
      {cppMessage && (
        <div className="cpp-output">
          <h2>Возможно изменение данных в базе:</h2>
          <pre>{cppMessage}</pre>
        </div>
      )}

      {/* Строка поиска */}
      <div className="search-container">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Введите номер детали/название детали..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="search-icon">
            <Search className="search-svg" />
          </div>
        </div>
      </div>

      {/* Фильтры статуса */}
      <div className="filters-container">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`filter-btn ${selectedStatus === 'all' ? 'filter-btn-active-all' : 'filter-btn-all'}`}
        >
          Все ({inventoryData.length})
        </button>
        <button
          onClick={() => setSelectedStatus('critical')}
          className={`filter-btn ${selectedStatus === 'critical' ? 'filter-btn-active-critical' : 'filter-btn-critical'}`}
        >
          Критический ({inventoryData.filter(item => item.status === 'critical').length})
        </button>
        <button
          onClick={() => setSelectedStatus('warning')}
          className={`filter-btn ${selectedStatus === 'warning' ? 'filter-btn-active-warning' : 'filter-btn-warning'}`}
        >
          Предупреждение ({inventoryData.filter(item => item.status === 'warning').length})
        </button>
        <button
          onClick={() => setSelectedStatus('good')}
          className={`filter-btn ${selectedStatus === 'good' ? 'filter-btn-active-good' : 'filter-btn-good'}`}
        >
          Хорошо ({inventoryData.filter(item => item.status === 'good').length})
        </button>
      </div>

      {/* Таблица */}
      <div className="table-container">
        {filteredData.length > 0 ? (
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead className="table-header">
                <tr>
                  <th className="table-th">Номер детали</th>
                  <th className="table-th">Наименование</th>
                  <th className="table-th">Количество на складе</th>
                  <th className="table-th">Местоположение на складе</th>
                  <th className="table-th">Предыдущий номер детали</th>
                  <th className="table-th">Следующий номер детали</th>
                  <th className="table-th">Страна производства</th>
                  <th className="table-th">Поставщик</th>
                  <th className="table-th">Дата замены</th>
                  <th className="table-th">Длительность последней доставки</th>
                  <th className="table-th">Статус</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredData.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className="table-row"
                      style={{
                        animationDelay: `${index * 100}ms`
                      }}
                    >
                      <td className="table-td">{item.fullData["Номер детали"]}</td>
                      <td className="table-td">{item.fullData["Наименование"]}</td>
                      <td className="table-td">{item.fullData["Количество на складе"]}</td>
                      <td className="table-td">{item.fullData["Местоположение на складе"]}</td>
                      <td className="table-td">{item.fullData["Прошлая используемая деталь"]}</td>
                      <td className="table-td">{item.fullData["Следующая используемая деталь"]}</td>
                      <td className="table-td">{item.fullData["Страна производства"]}</td>
                      <td className="table-td">{item.fullData["Поставщик"]}</td>
                      <td className="table-td">{item.fullData["Дата поставки"]}</td>
                      <td className="table-td">{item.fullData["Длительность последней доставки"]}</td>
                      <td className="table-td">
                        <span className={getStatusColor(item.status)}>
                          {item.status === 'critical' ? 'Критический' : 
                           item.status === 'warning' ? 'Предупреждение' : 'Хорошо'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ color: '#9ca3af', marginBottom: '1rem' }}>
              <Package style={{ height: '4rem', width: '4rem', margin: '0 auto' }} />
            </div>
            <p style={{ color: '#6b7280' }}>Нет данных для отображения</p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              {searchQuery || selectedStatus !== 'all' 
                ? 'Попробуйте изменить фильтры поиска' 
                : 'CSV файл пуст или не содержит корректных данных'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Компонент истории деталей
// Компонент истории деталей с автосортировкой событий
// Компонент истории деталей с автопоиском дат
const HistorySection = () => {
  const [searchNumber, setSearchNumber] = React.useState("");
  const [selectedPart, setSelectedPart] = React.useState(null);

  const handleSearch = () => {
    const found = inventoryData.find(
      (item) =>
        item.fullData["Номер детали"]?.toLowerCase().trim() ===
        searchNumber.toLowerCase().trim()
    );
    setSelectedPart(found || null);
  };

  // Автоматическая генерация событий из полей с датами
  const historyData = React.useMemo(() => {
    if (!selectedPart) return [];

    return Object.entries(selectedPart.fullData)
      .filter(([key, value]) => {
        if (!value) return false;
        // Ищем строки, которые похожи на дату
        return /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(value);
      })
      .map(([key, value]) => {
        const label = key.replace(/_/g, " "); // убираем подчеркивания
        return {
          date: value,
          event: label,
        };
      })
      .sort((a, b) => {
        // Сортировка по датам
        const parse = (d) => {
          const [day, month, year] = d.split(/[./-]/).map(Number);
          return new Date(year < 100 ? 2000 + year : year, month - 1, day);
        };
        return parse(b.date) - parse(a.date);
      });
  }, [selectedPart]);

  return (
    <div className="fade-in" style={{ padding: "2rem" }}>
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#374151",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FileText style={{ marginRight: "1rem", color: "#3b82f6" }} size={32} />
          История детали
        </h2>

        {/* Поле поиска */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <input
            type="text"
            placeholder="Введите номер детали..."
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            style={{
              flex: "1",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              outline: "none",
              fontSize: "1rem",
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Search size={18} /> Найти
          </button>
        </div>

        {/* Если нашли деталь */}
        {selectedPart && (
          <div
            className="slide-in"
            style={{
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1.5rem",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              transition: "all 0.3s ease",
            }}
          >
            {/* Основная информация */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem",
                fontSize: "0.875rem",
                color: "#6b7280",
                marginBottom: "2rem",
              }}
            >
              {Object.entries(selectedPart.fullData).map(([key, value], idx) => (
                <p key={idx}>
                  <span style={{ fontWeight: "600", color: "#374151" }}>{key}:</span> {value}
                </p>
              ))}
            </div>

            {/* История событий */}
            <h4 style={{ fontWeight: "600", marginBottom: "1rem" }}>Историческая линия:</h4>
            <div
              style={{
                position: "relative",
                paddingLeft: "20px",
                borderLeft: "2px solid #3b82f6",
              }}
            >
              {historyData.map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: "1.5rem",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "-7px",
                      top: "4px",
                      width: "12px",
                      height: "12px",
                      background: "#3b82f6",
                      borderRadius: "50%",
                    }}
                  ></div>
                  <div>
                    <strong>{h.date}</strong>
                    <p style={{ margin: 0 }}>{h.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Если не найдено */}
        {searchNumber && !selectedPart && (
          <p style={{ color: "#ef4444" }}>Деталь с таким номером не найдена</p>
        )}
      </div>
    </div>
  );
};


  // Компонент заказов
  const OrderSection = () => (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#374151', marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
          <Package style={{ marginRight: '1rem', color: '#3b82f6' }} size={32} />
          Управление заказами
        </h2>
        
        <div style={{ marginBottom: '2rem' }}>
          <button style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
          }}>
            Создать новый заказ
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151' }}>Рекомендуемые к заказу</h3>
          {inventoryData.filter(item => item.status === 'critical' || item.status === 'warning').map((item, index) => (
            <div key={item.id} className="slide-in" style={{
              borderLeft: '4px solid #f59e0b',
              background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
              padding: '1.5rem',
              borderRadius: '0 12px 12px 0',
              animationDelay: `${index * 200}ms`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                    {item.fullData["Наименование"]}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <p><span style={{ fontWeight: '500' }}>Номер:</span> {item.fullData["Номер детали"]}</p>
                    <p><span style={{ fontWeight: '500' }}>Остаток:</span> {item.fullData["Количество на складе"]} шт.</p>
                    <p><span style={{ fontWeight: '500' }}>Поставщик:</span> {item.fullData["Поставщик"]}</p>
                    <p><span style={{ fontWeight: '500' }}>Местоположение:</span> {item.fullData["Местоположение на складе"]}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Рекомендуемый заказ:</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                      {item.status === 'critical' ? '100' : '50'} шт.
                    </p>
                  </div>
                  <button style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}>
                    Заказать
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Компонент помощи
  const HelpSection = () => (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#374151', marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
          <Wrench style={{ marginRight: '1rem', color: '#3b82f6' }} size={32} />
          Справка и поддержка
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #93c5fd', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af', marginBottom: '1rem' }}>Быстрый старт</h3>
            <ul style={{ listStyle: 'none', padding: 0, color: '#1e40af', lineHeight: '1.8' }}>
              <li style={{ marginBottom: '0.5rem' }}>• Используйте поиск для быстрого нахождения деталей</li>
              <li style={{ marginBottom: '0.5rem' }}>• Фильтруйте по статусу для просмотра критических позиций</li>
              <li style={{ marginBottom: '0.5rem' }}>• Следите за рекомендациями в разделе "Заказ"</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ border: '2px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Статусы деталей</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '16px', height: '16px', background: '#dc2626', borderRadius: '50%', marginRight: '0.75rem' }}></span>
                  <span style={{ fontSize: '0.875rem' }}>Критический (≤5 шт.)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '16px', height: '16px', background: '#f59e0b', borderRadius: '50%', marginRight: '0.75rem' }}></span>
                  <span style={{ fontSize: '0.875rem' }}>Предупреждение (6-50 шт.)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '50%', marginRight: '0.75rem' }}></span>
                  <span style={{ fontSize: '0.875rem' }}>Хорошо (50 шт.)</span>
                </div>
              </div>
            </div>

            <div style={{ border: '2px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Контакты поддержки</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <p>📧 Email: support@warehouse.com</p>
                <p>📞 Телефон: +7 (800) 123-45-67</p>
                <p>🕒 Часы работы: Пн-Пт 9:00-18:00</p>
              </div>
            </div>
          </div>

          <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Часто задаваемые вопросы</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ fontSize: '1rem', fontWeight: '500', color: '#4b5563', padding: '0.5rem 0' }}>
                  Как добавить новую деталь?
                </summary>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', paddingLeft: '1rem' }}>
                  Обратитесь к администратору системы для добавления новых позиций в каталог.
                </p>
              </details>
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ fontSize: '1rem', fontWeight: '500', color: '#4b5563', padding: '0.5rem 0' }}>
                  Как обновить количество на складе?
                </summary>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', paddingLeft: '1rem' }}>
                  Количество обновляется автоматически при поступлении и списании товаров.
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Компонент PowerGuide 
  const PowerGuideSection = () => (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#374151', marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
          <Zap style={{ marginRight: '1rem', color: '#3b82f6' }} size={32} />
          PowerGuide - Каталог запчастей
        </h2>
        
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ marginBottom: '2rem' }}>
            <Zap style={{ margin: '0 auto', height: '4rem', width: '4rem', color: '#3b82f6' }} />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
            Переход в PowerGuide
          </h3>
          <button 
            onClick={handleClick}
            className="powerguide-btn"
          >
            <Zap style={{ marginRight: '0.5rem' }} size={20} />
            Открыть PowerGuide
          </button>
        </div>
        {activeSection === 'powerguide' && (
  <div style={{ padding: '2rem' }}>
    <h2>PowerGuide</h2>
    <iframe
      src="https://pwg-udm.igatec.com/login-page/login" // Заменить на нужную ссылку
      style={{
        width: '100%',
        height: '80vh',
        border: '1px solid #ccc',
        borderRadius: '12px',
        marginTop: '1rem',
      }}
      title="PowerGuide"
    />
  </div>
)}



      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'info':
        return <InfoSection />;
      case 'history':
        return <HistorySection />;
      case 'order':
        return <OrderSection />;
      case 'help':
        return <HelpSection />;
      case 'powerguide':
        return <PowerGuideSection />;
      default:
        return <InfoSection />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Боковая панель */}
      <div className="sidebar">
        <div className="menu-items">
          <h1>Склад</h1>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <div
                key={item.id}
                className={`menu-item ${isActive ? 'menu-item-active' : ''}`}
                onClick={() => handleSidebarClick(item.id)}
                style={{
                  animationDelay: `${index * 150}ms`
                }}
              >
                <div className="glow-effect"></div>
                <div className="menu-item-content">
                  <div className={`menu-icon ${isActive ? 'menu-icon-active' : ''}`}>
                    <Icon 
                      size={24} 
                      className={`icon ${isActive ? 'icon-active' : ''}`}
                    />
                  </div>
                  <span className={`menu-label ${isActive ? 'menu-label-active' : ''}`}>
                    {item.label}
                  </span>
                </div>
                {isActive && <div className="active-indicator"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Основной контент */}
      <div className="main-content">
        {renderSection()}
      </div>

      {/* PowerGuide кнопка */}
      {activeSection !== 'powerguide' && (
        <div className="powerguide-container">
          <button onClick={handleClick} className="powerguide-btn">
            <Zap style={{ marginRight: '0.5rem' }} size={20} />
            PowerGuide
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;