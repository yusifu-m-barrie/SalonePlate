import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantStatus, RiderStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { SearchOrdersDto } from './dto/search-orders.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(@Query('cityId') cityId?: string) {
    return this.adminService.getDashboardStats(cityId);
  }

  @Get('orders')
  searchOrders(@Query() query: SearchOrdersDto) {
    return this.adminService.searchOrders(query);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrderById(id);
  }

  @Get('communications')
  getCommunications(
    @Query('orderId') orderId?: string,
    @Query('limit') limit?: string,
    @Query('filter') filter?: string,
  ) {
    return this.adminService.getCommunications(orderId, Number(limit) || 100, filter);
  }

  @Get('restaurants')
  listRestaurants(@Query('status') status?: RestaurantStatus) {
    return this.adminService.listRestaurants(status);
  }

  @Get('restaurants/:id')
  getRestaurant(@Param('id') id: string) {
    return this.adminService.getRestaurantById(id);
  }

  @Get('riders')
  listRiders(@Query('status') status?: RiderStatus) {
    return this.adminService.listRiders(status);
  }

  @Patch('restaurants/:id/approve')
  approveRestaurant(@Param('id') id: string) {
    return this.adminService.approveRestaurant(id);
  }

  @Patch('restaurants/:id/reject')
  rejectRestaurant(@Param('id') id: string) {
    return this.adminService.rejectRestaurant(id);
  }

  @Patch('restaurants/:id/suspend')
  suspendRestaurant(@Param('id') id: string) {
    return this.adminService.suspendRestaurant(id);
  }

  @Patch('riders/:id/approve')
  approveRider(@Param('id') id: string) {
    return this.adminService.approveRider(id);
  }

  @Patch('riders/:id/reject')
  rejectRider(@Param('id') id: string) {
    return this.adminService.rejectRider(id);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.adminService.banUser(id);
  }

  @Get('customers')
  listCustomers(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listCustomers(q, Number(page) || 1, Number(limit) || 50);
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Patch('cities/:id')
  updateCity(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.updateCity(id, body as Parameters<AdminService['updateCity']>[1]);
  }
}
