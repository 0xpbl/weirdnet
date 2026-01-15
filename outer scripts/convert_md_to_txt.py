#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para converter arquivos Markdown para TXT organizados por ano
"""

import os
import re
from pathlib import Path
from datetime import datetime

def extract_metadata(content):
    """Extrai metadados do arquivo Markdown"""
    metadata = {}
    
    # Extrair título (primeira linha com #)
    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    if title_match:
        metadata['title'] = title_match.group(1).strip()
    
    # Extrair metadados da seção Message Metadata
    date_match = re.search(r'\*\*Date:\*\* (.+)', content)
    if date_match:
        metadata['date'] = date_match.group(1).strip()
        # Extrair ano da data
        year_match = re.search(r'(\d{4})', metadata['date'])
        if year_match:
            metadata['year'] = year_match.group(1)
    
    from_match = re.search(r'\*\*From:\*\* (.+)', content)
    if from_match:
        metadata['from'] = from_match.group(1).strip()
    
    to_match = re.search(r'\*\*To:\*\* (.+)', content)
    if to_match:
        metadata['to'] = to_match.group(1).strip()
    
    subject_match = re.search(r'\*\*Subject:\*\* (.+)', content)
    if subject_match:
        metadata['subject'] = subject_match.group(1).strip()
    
    return metadata

def extract_email_content(content):
    """Extrai o conteúdo do email (após a seção ## Email)"""
    # Encontrar onde começa o conteúdo do email
    email_start = content.find('## Email')
    if email_start == -1:
        return ""
    
    # Pegar tudo após "## Email" e pular linhas vazias iniciais
    email_content = content[email_start:].split('\n', 1)
    if len(email_content) > 1:
        content_text = email_content[1].strip()
    else:
        return ""
    
    return content_text

def markdown_to_txt(text):
    """Converte texto Markdown para formato TXT legível"""
    # Remover formatação Markdown
    # Títulos H1 (# Título)
    text = re.sub(r'^# (.+)$', r'\1', text, flags=re.MULTILINE)
    
    # Títulos H2 (## Seção)
    text = re.sub(r'^## (.+)$', r'\1:', text, flags=re.MULTILINE)
    
    # Negrito (**texto**)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    
    # Itálico (*texto*)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    
    # Separador horizontal (---)
    text = re.sub(r'^---+$', '---', text, flags=re.MULTILINE)
    
    # Listas (- item)
    text = re.sub(r'^- ', '', text, flags=re.MULTILINE)
    
    # Remover múltiplas linhas vazias (máximo 2 consecutivas)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()

def format_date(date_str):
    """Formata a data de forma legível"""
    try:
        # Tentar parsear a data no formato original
        # Ex: "Thu, 06 Apr 2000 09:52:53 -0300"
        dt = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z")
        return dt.strftime("%d/%m/%Y %H:%M")
    except:
        # Se não conseguir, retornar a data original
        return date_str

def convert_md_to_txt(md_file_path, output_dir):
    """Converte um arquivo MD para TXT"""
    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extrair metadados
    metadata = extract_metadata(content)
    
    if not metadata.get('year'):
        print(f"Aviso: Não foi possível extrair o ano de {md_file_path}")
        return False
    
    year = metadata['year']
    
    # Extrair conteúdo do email
    email_content = extract_email_content(content)
    
    # Converter conteúdo para TXT
    txt_content_clean = markdown_to_txt(email_content)
    
    # Construir arquivo TXT final
    txt_output = []
    
    # Título
    if metadata.get('title'):
        txt_output.append(metadata['title'].upper())
        txt_output.append("")
    
    # Metadados
    txt_output.append("Data: " + format_date(metadata.get('date', '')))
    if metadata.get('from'):
        txt_output.append("De: " + metadata['from'])
    if metadata.get('to'):
        txt_output.append("Para: " + metadata['to'])
    if metadata.get('subject'):
        txt_output.append("Assunto: " + metadata['subject'])
    
    txt_output.append("")
    txt_output.append("---")
    txt_output.append("")
    
    # Conteúdo do email
    txt_output.append(txt_content_clean)
    
    # Criar pasta do ano se não existir
    year_dir = output_dir / year
    year_dir.mkdir(parents=True, exist_ok=True)
    
    # Nome do arquivo de saída (mesmo nome base, mas .txt)
    md_filename = md_file_path.stem
    txt_filename = f"{md_filename}.txt"
    txt_file_path = year_dir / txt_filename
    
    # Salvar arquivo TXT
    with open(txt_file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(txt_output))
    
    return True

def main():
    """Função principal"""
    # Diretórios
    script_dir = Path(__file__).parent
    random_dir = script_dir / 'random'
    output_dir = script_dir / 'txt'
    
    if not random_dir.exists():
        print(f"Erro: Pasta 'random' não encontrada em {script_dir}")
        return
    
    # Criar diretório de saída
    output_dir.mkdir(exist_ok=True)
    
    # Processar todos os arquivos .md
    md_files = list(random_dir.glob('*.md'))
    print(f"Encontrados {len(md_files)} arquivos Markdown para processar...")
    
    converted = 0
    errors = 0
    
    for md_file in sorted(md_files):
        try:
            if convert_md_to_txt(md_file, output_dir):
                converted += 1
                print(f"[OK] Convertido: {md_file.name}")
            else:
                errors += 1
                print(f"[ERRO] Erro ao converter: {md_file.name}")
        except Exception as e:
            errors += 1
            print(f"[ERRO] Erro ao processar {md_file.name}: {e}")
    
    print(f"\nConversão concluída!")
    print(f"  - Convertidos: {converted}")
    print(f"  - Erros: {errors}")
    print(f"  - Arquivos salvos em: {output_dir}")

if __name__ == '__main__':
    main()
