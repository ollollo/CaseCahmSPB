import pandas as pd
import os
import sys

# Абсолютный путь к папке с CSV файлами
TABELS_DIR = r"C:\Users\ollol\Desktop\PowerGuide\powerguide-frontend\public\Tabels"

KSUNCI_path = os.path.join(TABELS_DIR, "KSUNCI.csv")
Proizvodstvo_path = os.path.join(TABELS_DIR, "Proizvodstvo.csv")
Sklad_path = os.path.join(TABELS_DIR, "Sklad.csv")
output_path = os.path.join(TABELS_DIR, "output.csv")

def merge_csv_files(file_paths, output_file):
    """
    Объединяет несколько CSV файлов в один
    
    Args:
        file_paths (list): Список путей к CSV файлам
        output_file (str): Путь к выходному файлу
    """
    dataframes = []
    
    print("Начинаем объединение CSV файлов...")
    
    for i, file_path in enumerate(file_paths, 1):
        try:
            print(f"Обрабатываем файл {i}: {os.path.basename(file_path)}")
            
            encodings = ['utf-8', 'cp1251', 'latin-1']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    print(f"  Успешно прочитан с кодировкой {encoding}")
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                print(f"  Ошибка: Не удалось прочитать файл с доступными кодировками")
                continue
                
            print(f"  Размер: {len(df)} строк, {len(df.columns)} столбцов")
            print(f"  Столбцы: {list(df.columns)}")
            dataframes.append(df)
            
        except FileNotFoundError:
            print(f"  Ошибка: Файл {file_path} не найден")
        except Exception as e:
            print(f"  Ошибка при чтении {file_path}: {e}")
    
    if not dataframes:
        print("Ошибка: Нет файлов для объединения")
        return False
    
    print(f"Найдено {len(dataframes)} файлов для объединения")
    
    try:
        merged_df = pd.concat(dataframes, ignore_index=True)
        print(f"Объединение выполнено: {len(merged_df)} строк, {len(merged_df.columns)} столбцов")
        
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        merged_df.to_csv(output_file, index=False, encoding='utf-8')
        print(f"Объединенный файл сохранен как {output_file}")
        
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            print(f"Размер выходного файла: {file_size} байт")
            return True
        else:
            print("Ошибка: Выходной файл не был создан")
            return False
            
    except Exception as e:
        print(f"Ошибка при объединении или сохранении: {e}")
        return False

def main():
    print("=== Объединение CSV файлов ===")
    print(f"Папка с таблицами: {TABELS_DIR}")
    
    if not os.path.exists(TABELS_DIR):
        print(f"Ошибка: Папка {TABELS_DIR} не существует")
        sys.exit(1)
    
    csv_files = [KSUNCI_path, Proizvodstvo_path, Sklad_path]
    
    existing_files = []
    for file_path in csv_files:
        if os.path.exists(file_path):
            existing_files.append(file_path)
            print(f"Найден файл: {os.path.basename(file_path)}")
        else:
            print(f"Файл не найден: {os.path.basename(file_path)}")
    
    if not existing_files:
        print("Ошибка: Не найдено ни одного CSV файла для объединения")
        sys.exit(1)
    
    success = merge_csv_files(existing_files, output_path)
    
    if success:
        print("=== Объединение завершено успешно ===")
        sys.exit(0)
    else:
        print("=== Объединение завершилось с ошибкой ===")
        sys.exit(1)

if __name__ == "__main__":
    main()
