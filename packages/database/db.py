"""
Camada de acesso a dados via subprocess -> psql.

Por que assim: a sandbox de execução desta sessão não teve acesso a
registradores de pacotes (nem npm, nem PyPI, nem os espelhos do apt), então
não foi possível instalar psycopg2/asyncpg/Prisma. O cliente `psql` já vem
instalado no sistema, então esta camada fala com o Postgres através dele.

Quando o projeto for migrado para um ambiente com acesso normal à internet
(a própria máquina do usuário, ou deploy em produção), troque isto por
psycopg2/SQLAlchemy ou pelo Prisma Client (ver prisma/schema.prisma) sem
precisar mudar o schema do banco — o SQL gerado é Postgres padrão.
"""

import csv
import io
import os
import subprocess

PGHOST = os.environ.get("PGHOST", "localhost")
PGPORT = os.environ.get("PGPORT", "5432")
PGUSER = os.environ.get("PGUSER", "mge")
PGPASSWORD = os.environ.get("PGPASSWORD", "mge_local_dev")
PGDATABASE = os.environ.get("PGDATABASE", "marketplace_growth_engine")


def _env():
    e = os.environ.copy()
    e["PGPASSWORD"] = PGPASSWORD
    return e


def _base_cmd():
    return ["psql", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", PGDATABASE, "-v", "ON_ERROR_STOP=1"]


def query(sql: str) -> list[dict]:
    """Executa um SELECT e devolve uma lista de dicts (colunas -> valor em string)."""
    cmd = _base_cmd() + ["--csv", "-c", sql]
    result = subprocess.run(cmd, capture_output=True, text=True, env=_env())
    if result.returncode != 0:
        raise RuntimeError(f"Erro SQL: {result.stderr}\nSQL: {sql}")
    reader = csv.DictReader(io.StringIO(result.stdout))
    return list(reader)


def execute(sql: str) -> str:
    """Executa INSERT/UPDATE/DELETE/DDL. Devolve stdout bruto do psql."""
    cmd = _base_cmd() + ["-c", sql]
    result = subprocess.run(cmd, capture_output=True, text=True, env=_env())
    if result.returncode != 0:
        raise RuntimeError(f"Erro SQL: {result.stderr}\nSQL: {sql}")
    return result.stdout


def execute_file(path: str) -> str:
    cmd = _base_cmd() + ["-f", path]
    result = subprocess.run(cmd, capture_output=True, text=True, env=_env())
    if result.returncode != 0:
        raise RuntimeError(f"Erro ao aplicar {path}: {result.stderr}")
    return result.stdout


def quote(value) -> str:
    """Converte um valor Python em literal SQL seguro (escape manual de aspas)."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, tuple)):
        items = ",".join(_quote_array_item(v) for v in value)
        return "'{" + items + "}'"
    s = str(value).replace("\\", "\\\\").replace("'", "''")
    return f"'{s}'"


def _quote_array_item(value) -> str:
    s = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{s}"'


def json_quote(value) -> str:
    import json

    s = json.dumps(value, ensure_ascii=False).replace("'", "''")
    return f"'{s}'::jsonb"
