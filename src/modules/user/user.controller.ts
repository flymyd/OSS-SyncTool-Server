import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ChangePasswordDto, CreateUserDto, LoginUserDto } from './dto/user.dto';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.userId, changePasswordDto);
  }
}
