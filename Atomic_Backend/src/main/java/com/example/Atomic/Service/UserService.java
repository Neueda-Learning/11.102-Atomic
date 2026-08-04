package com.example.Atomic.Service;

import com.example.Atomic.Model.User;
import com.example.Atomic.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {
    @Autowired
    UserRepo userRepo;
    public String createUser(Double accountBalance, String firstName, String lastName,
                             String email, String password){
        if (userRepo.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = new User(accountBalance, firstName, lastName, email, password);
        userRepo.save(user);
        return "User created successfully!";
    }
    public Optional<User> findUser(Long accountNumber) {
        return userRepo.findById(accountNumber);
    }
    public boolean authenticateEmail(String email, String password) {
        if(userRepo.existsByEmailIgnoreCase(email)){
            return true;
        }
        return false;
    }
    public boolean authenticatePassword(String email, String password){
        if(authenticateEmail(email, password)) {
            User user = userRepo.findByEmailIgnoreCase(email);
            if (password.equals(user.getPassword())) {
                return true;
            }
            return false;
        }
        return false;
    }
    public User fetchAfterAuthenticate(String email, String password) {
        if(authenticatePassword(email, password)) {
            User user = userRepo.findByEmailIgnoreCase(email);
            return user;
        }
        return null;
    }
}
