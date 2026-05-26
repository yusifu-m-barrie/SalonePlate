import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CitiesService } from './cities.service';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Get()
  findAll() {
    return this.citiesService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.citiesService.findBySlug(slug);
  }
}
