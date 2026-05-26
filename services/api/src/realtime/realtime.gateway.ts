import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_order')
  handleJoinOrder(client: Socket, orderId: string) {
    client.join(`order:${orderId}`);
    return { event: 'joined', orderId };
  }

  @SubscribeMessage('join_restaurant')
  handleJoinRestaurant(client: Socket, restaurantId: string) {
    client.join(`restaurant:${restaurantId}`);
    return { event: 'joined', restaurantId };
  }

  @SubscribeMessage('join_customer')
  handleJoinCustomer(client: Socket, userId: string) {
    client.join(`customer:${userId}`);
    return { event: 'joined', userId };
  }

  @SubscribeMessage('join_admin')
  handleJoinAdmin(client: Socket) {
    client.join('admin');
    return { event: 'joined', room: 'admin' };
  }

  @SubscribeMessage('rider_location')
  handleRiderLocation(client: Socket, payload: { orderId: string; lat: number; lng: number }) {
    this.server.to(`order:${payload.orderId}`).emit('rider_location', payload);
  }

  emitOrderUpdate(orderId: string, data: unknown) {
    this.server.to(`order:${orderId}`).emit('order_update', data);
  }

  emitToRestaurant(restaurantId: string, event: string, data: unknown) {
    this.server.to(`restaurant:${restaurantId}`).emit(event, data);
  }

  emitToCustomer(userId: string, event: string, data: unknown) {
    this.server.to(`customer:${userId}`).emit(event, data);
  }

  emitToAdmin(event: string, data: unknown) {
    this.server.to('admin').emit(event, data);
  }
}
