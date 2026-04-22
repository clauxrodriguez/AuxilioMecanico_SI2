import { Injectable } from '@angular/core';

export interface Vehiculo {
  id: string;
  anio?: number;
  placa?: string;
  marca?: string;
  modelo?: string;
  principal?: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  vehiculos: Vehiculo[];
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private clientes: Cliente[] = [];

  constructor() {
    // seed some mock data
    this.clientes = [
      {
        id: 'c1',
        nombre: 'Juan Perez',
        email: 'juan@example.com',
        telefono: '+59170000000',
        activo: true,
        vehiculos: [
          { id: 'v1', anio: 2018, placa: 'ABC123', marca: 'Toyota', modelo: 'Corolla', principal: true },
          { id: 'v2', anio: 2020, placa: 'XYZ987', marca: 'Honda', modelo: 'Civic' },
        ],
      },
      {
        id: 'c2',
        nombre: 'María Gomez',
        email: 'maria@example.com',
        telefono: '+59171111111',
        activo: true,
        vehiculos: [],
      },
    ];
  }

  list(): Cliente[] {
    return this.clientes;
  }

  get(id: string): Cliente | undefined {
    return this.clientes.find((c) => c.id === id);
  }

  addVehiculo(clienteId: string, veh: Vehiculo): Vehiculo {
    const cliente = this.get(clienteId);
    if (!cliente) throw new Error('Cliente no encontrado');
    cliente.vehiculos.push(veh);
    return veh;
  }

  updateVehiculo(clienteId: string, vehiculoId: string, patch: Partial<Vehiculo>): Vehiculo {
    const cliente = this.get(clienteId);
    if (!cliente) throw new Error('Cliente no encontrado');
    const v = cliente.vehiculos.find((x) => x.id === vehiculoId);
    if (!v) throw new Error('Vehiculo no encontrado');
    Object.assign(v, patch);
    return v;
  }

  deleteVehiculo(clienteId: string, vehiculoId: string) {
    const cliente = this.get(clienteId);
    if (!cliente) throw new Error('Cliente no encontrado');
    cliente.vehiculos = cliente.vehiculos.filter((x) => x.id !== vehiculoId);
  }

  setPrincipal(clienteId: string, vehiculoId: string): Vehiculo {
    const cliente = this.get(clienteId);
    if (!cliente) throw new Error('Cliente no encontrado');
    for (const v of cliente.vehiculos) v.principal = false;
    const found = cliente.vehiculos.find((x) => x.id === vehiculoId);
    if (!found) throw new Error('Vehiculo no encontrado');
    found.principal = true;
    return found;
  }
}
