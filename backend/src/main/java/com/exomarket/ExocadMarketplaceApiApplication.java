package com.exomarket;

import com.exomarket.config.StorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@EnableConfigurationProperties(StorageProperties.class)
@SpringBootApplication
public class ExocadMarketplaceApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ExocadMarketplaceApiApplication.class, args);
	}

}
