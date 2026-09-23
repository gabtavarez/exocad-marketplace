package com.exomarket;

import com.exomarket.repository.OrderRepository;
import com.exomarket.repository.OrderAttachmentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest(properties = "spring.autoconfigure.exclude="
		+ "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
		+ "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
		+ "org.springframework.boot.data.jpa.autoconfigure.JpaRepositoriesAutoConfiguration,"
		+ "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration")
class ExocadMarketplaceApiApplicationTests {

	@MockitoBean
	private OrderRepository orderRepository;

	@MockitoBean
	private OrderAttachmentRepository orderAttachmentRepository;

	@Test
	void contextLoads() {
	}

}
